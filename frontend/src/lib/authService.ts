import { z } from 'zod';
import api from './axios';
import type { AuthUser } from '../stores/authStore';

// ============================================================
// SYSTEM USER DATABASE INITIALIZATION
// Pre-seeded with admin@stocksense.com / admin123
// ============================================================

export interface StoredUser {
  id: string;
  loginId: string;
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'USER';
  status: 'ACTIVE' | 'BANNED';
  emailVerified: boolean;
  createdAt: string;
}

const STORAGE_KEY_USERS = 'stocksense_users_db';
const STORAGE_KEY_OTP = 'stocksense_otp_db';

const DEFAULT_USERS: StoredUser[] = [
  {
    id: 'usr_admin_001',
    loginId: 'admin',
    email: 'admin@stocksense.com',
    password: 'admin123',
    name: 'StockSense Admin',
    role: 'ADMIN',
    status: 'ACTIVE',
    emailVerified: true,
    createdAt: new Date().toISOString(),
  },
];

export function getUsersFromDb(): StoredUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    // Ensure default admin user always exists
    const hasAdmin = parsed.some(
      (u: StoredUser) => u.email.toLowerCase() === 'admin@stocksense.com' || u.loginId.toLowerCase() === 'admin'
    );
    if (!hasAdmin) {
      const merged = [...DEFAULT_USERS, ...parsed];
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(merged));
      return merged;
    }
    return parsed;
  } catch {
    return DEFAULT_USERS;
  }
}

export function saveUsersToDb(users: StoredUser[]): void {
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
}

// ============================================================
// ZOD VALIDATION SCHEMAS (Phase 1 specification)
// ============================================================

// 1. Login schema
export const loginZodSchema = z.object({
  loginId: z.string().min(1, 'Please enter your Login Id or Email'),
  password: z.string().min(1, 'Please enter your password'),
});

export type LoginFormData = z.infer<typeof loginZodSchema>;

// 2. Sign Up schema with wireframe rules:
// - Login Id: 6-12 characters
// - Email: Valid email format
// - Password: > 8 chars, must contain lowercase, uppercase, and special character
// - Re-Enter Password: must match password
export const registerZodSchema = z
  .object({
    loginId: z
      .string()
      .trim()
      .min(6, 'Login Id must be at least 6 characters')
      .max(12, 'Login Id cannot exceed 12 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Login Id can only contain letters, numbers, and underscores'),
    email: z
      .string()
      .trim()
      .min(1, 'Email Id is required')
      .email('Please enter a valid Email Id'),
    password: z
      .string()
      .min(9, 'Password must be more than 8 characters')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please re-enter your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerZodSchema>;

// 3. Forgot Password schema
export const forgotPasswordZodSchema = z.object({
  identifier: z.string().trim().min(1, 'Please enter your Email Id or Login Id'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordZodSchema>;

// 4. Reset Password schema
export const resetPasswordZodSchema = z
  .object({
    identifier: z.string().trim().min(1, 'Please enter your Email Id or Login Id'),
    otp: z.string().trim().length(6, 'OTP code must be 6 digits'),
    newPassword: z
      .string()
      .min(9, 'Password must be more than 8 characters')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please re-enter your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordZodSchema>;

// ============================================================
// AUTHENTICATION SERVICE IMPLEMENTATION
// ============================================================

export interface AuthSuccessResult {
  user: AuthUser;
  token: string;
}

export const authService = {
  /**
   * Login user with Login Id or Email and password.
   * Throws "Invalid Login Id or Password" on mismatch.
   */
  async login(loginIdOrEmail: string, password: string): Promise<AuthSuccessResult> {
    const trimmedId = loginIdOrEmail.trim().toLowerCase();

    // 1. Check local client-side persistent user database first
    const users = getUsersFromDb();
    const matchedUser = users.find((u) => {
      const emailMatch = u.email.toLowerCase() === trimmedId;
      const loginIdMatch = u.loginId.toLowerCase() === trimmedId;
      return (emailMatch || loginIdMatch) && u.password === password;
    });

    if (matchedUser) {
      const authUser: AuthUser = {
        id: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role,
        status: matchedUser.status,
        emailVerified: matchedUser.emailVerified,
        createdAt: matchedUser.createdAt,
      };

      const token = `stocksense_jwt_${matchedUser.id}_${Date.now()}`;
      return { user: authUser, token };
    }

    // 3. Fallback: try backend API with a short 2.5s timeout if running
    const isTest =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'test') ||
      (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.NODE_ENV === 'test');

    if (!isTest) {
      try {
        const response = await api.post(
          '/auth/login',
          { email: trimmedId, password },
          { timeout: 2500 }
        );
        if (response.data?.data) {
          const { user, accessToken } = response.data.data;
          return {
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role === 'admin' || user.role === 'manager' ? 'ADMIN' : 'USER',
              status: 'ACTIVE',
              emailVerified: user.emailVerified ?? true,
              createdAt: user.createdAt,
            },
            token: accessToken,
          };
        }
      } catch {
        // Fall through to error
      }
    }

    throw new Error('Invalid Login Id or Password');
  },

  /**
   * Register a new user into the database.
   * Validates uniqueness of Login Id and Email Id.
   */
  async register(data: RegisterFormData): Promise<AuthSuccessResult> {
    const users = getUsersFromDb();
    const trimmedLoginId = data.loginId.trim();
    const trimmedEmail = data.email.trim().toLowerCase();

    // 1. Check if Login Id is unique
    const existingLoginId = users.find(
      (u) => u.loginId.toLowerCase() === trimmedLoginId.toLowerCase()
    );
    if (existingLoginId) {
      throw new Error(`Login Id "${trimmedLoginId}" is already taken. Please choose another.`);
    }

    // 2. Check if Email Id is unique
    const existingEmail = users.find(
      (u) => u.email.toLowerCase() === trimmedEmail
    );
    if (existingEmail) {
      throw new Error(`Email Id "${data.email}" is already registered. Please sign in or use another email.`);
    }

    // Create user object
    const newUser: StoredUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      loginId: trimmedLoginId,
      email: trimmedEmail,
      password: data.password,
      name: trimmedLoginId.charAt(0).toUpperCase() + trimmedLoginId.slice(1),
      role: 'USER',
      status: 'ACTIVE',
      emailVerified: true,
      createdAt: new Date().toISOString(),
    };

    // Save into persistent database
    users.push(newUser);
    saveUsersToDb(users);

    // Also attempt backend registration if backend is reachable
    try {
      await api.post('/auth/register', {
        email: trimmedEmail,
        password: data.password,
        name: newUser.name,
      });
    } catch {
      // Local database is source of truth during offline/standalone demo
    }

    const authUser: AuthUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      emailVerified: newUser.emailVerified,
      createdAt: newUser.createdAt,
    };

    const token = `stocksense_jwt_${newUser.id}_${Date.now()}`;
    return { user: authUser, token };
  },

  /**
   * Request password reset.
   * Generates a 6-digit OTP stored in database with 10 minutes expiry.
   */
  async requestPasswordReset(identifier: string): Promise<{ otp: string; message: string }> {
    const users = getUsersFromDb();
    const trimmed = identifier.trim().toLowerCase();
    const user = users.find(
      (u) => u.email.toLowerCase() === trimmed || u.loginId.toLowerCase() === trimmed
    );

    if (!user) {
      throw new Error('No account found with this Login Id or Email');
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    const otpDb = JSON.parse(localStorage.getItem(STORAGE_KEY_OTP) || '{}');
    otpDb[user.email.toLowerCase()] = { otp, expiry, userId: user.id };
    localStorage.setItem(STORAGE_KEY_OTP, JSON.stringify(otpDb));

    return {
      otp,
      message: `A 6-digit verification code has been generated: ${otp}`,
    };
  },

  /**
   * Verify OTP and reset password.
   */
  async resetPassword(data: ResetPasswordFormData): Promise<void> {
    const users = getUsersFromDb();
    const trimmed = data.identifier.trim().toLowerCase();
    const userIndex = users.findIndex(
      (u) => u.email.toLowerCase() === trimmed || u.loginId.toLowerCase() === trimmed
    );

    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const user = users[userIndex];
    const otpDb = JSON.parse(localStorage.getItem(STORAGE_KEY_OTP) || '{}');
    const record = otpDb[user.email.toLowerCase()];

    if (!record || record.otp !== data.otp.trim()) {
      throw new Error('Invalid OTP code');
    }

    if (Date.now() > record.expiry) {
      throw new Error('OTP code has expired. Please request a new code.');
    }

    // Update password in database
    users[userIndex].password = data.newPassword;
    saveUsersToDb(users);

    // Clean up used OTP
    delete otpDb[user.email.toLowerCase()];
    localStorage.setItem(STORAGE_KEY_OTP, JSON.stringify(otpDb));
  },
};
