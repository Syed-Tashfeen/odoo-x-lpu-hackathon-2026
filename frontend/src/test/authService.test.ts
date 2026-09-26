import { describe, it, expect, beforeEach } from 'vitest';
import {
  authService,
  registerZodSchema,
  getUsersFromDb,
} from '../lib/authService';

describe('Auth Service & User Database (Phase 1)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Pre-seeded Admin User', () => {
    it('initializes database with default admin credentials', () => {
      const users = getUsersFromDb();
      expect(users.length).toBeGreaterThanOrEqual(1);
      const admin = users.find((u) => u.email === 'admin@stocksense.com');
      expect(admin).toBeDefined();
      expect(admin?.loginId).toBe('admin');
      expect(admin?.password).toBe('admin123');
    });

    it('successfully logs in with admin email and admin123', async () => {
      const result = await authService.login('admin@stocksense.com', 'admin123');
      expect(result.user.email).toBe('admin@stocksense.com');
      expect(result.user.role).toBe('ADMIN');
      expect(result.token).toContain('stocksense_jwt_');
    });

    it('successfully logs in with loginId "admin" and admin123', async () => {
      const result = await authService.login('admin', 'admin123');
      expect(result.user.email).toBe('admin@stocksense.com');
      expect(result.token).toBeDefined();
    });

    it('throws "Invalid Login Id or Password" on wrong password', async () => {
      await expect(authService.login('admin@stocksense.com', 'wrongpassword')).rejects.toThrow(
        'Invalid Login Id or Password'
      );
    });

    it('throws "Invalid Login Id or Password" on non-existent user', async () => {
      await expect(authService.login('unknown@stocksense.com', 'admin123')).rejects.toThrow(
        'Invalid Login Id or Password'
      );
    });
  });

  describe('Sign Up / Registration Validation Rules', () => {
    it('validates loginId between 6-12 characters', () => {
      // Too short (< 6)
      const shortResult = registerZodSchema.safeParse({
        loginId: 'user1',
        email: 'user1@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
      expect(shortResult.success).toBe(false);

      // Too long (> 12)
      const longResult = registerZodSchema.safeParse({
        loginId: 'verylongloginidentifier',
        email: 'user1@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
      expect(longResult.success).toBe(false);

      // Valid (6-12 chars)
      const validResult = registerZodSchema.safeParse({
        loginId: 'operator1',
        email: 'operator1@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
      expect(validResult.success).toBe(true);
    });

    it('validates password criteria (>8 chars, uppercase, lowercase, special char)', () => {
      // Missing special char
      const noSpecial = registerZodSchema.safeParse({
        loginId: 'operator1',
        email: 'operator1@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
      expect(noSpecial.success).toBe(false);

      // Missing uppercase
      const noUpper = registerZodSchema.safeParse({
        loginId: 'operator1',
        email: 'operator1@example.com',
        password: 'password123!',
        confirmPassword: 'password123!',
      });
      expect(noUpper.success).toBe(false);

      // Too short (<= 8 chars)
      const shortPass = registerZodSchema.safeParse({
        loginId: 'operator1',
        email: 'operator1@example.com',
        password: 'Pass12!',
        confirmPassword: 'Pass12!',
      });
      expect(shortPass.success).toBe(false);
    });

    it('validates password matching', () => {
      const mismatch = registerZodSchema.safeParse({
        loginId: 'operator1',
        email: 'operator1@example.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!',
      });
      expect(mismatch.success).toBe(false);
    });
  });

  describe('Sign Up & Database Persistence Flow', () => {
    it('creates a new user and allows login with both email and loginId', async () => {
      const regData = {
        loginId: 'warehouse1',
        email: 'warehouse1@stocksense.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
      };

      const result = await authService.register(regData);
      expect(result.user.email).toBe('warehouse1@stocksense.com');

      // Verify persisted in database
      const users = getUsersFromDb();
      expect(users.some((u) => u.loginId === 'warehouse1')).toBe(true);

      // Verify user can now log in with loginId
      const loginWithId = await authService.login('warehouse1', 'SecurePass123!');
      expect(loginWithId.user.id).toBe(result.user.id);

      // Verify user can now log in with email
      const loginWithEmail = await authService.login('warehouse1@stocksense.com', 'SecurePass123!');
      expect(loginWithEmail.user.id).toBe(result.user.id);
    });

    it('rejects duplicate loginId on signup', async () => {
      const regData = {
        loginId: 'admin',
        email: 'newadmin@stocksense.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
      };

      await expect(authService.register(regData)).rejects.toThrow('already taken');
    });

    it('rejects duplicate email on signup', async () => {
      const regData = {
        loginId: 'newadmin123',
        email: 'admin@stocksense.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
      };

      await expect(authService.register(regData)).rejects.toThrow('already registered');
    });
  });

  describe('Password Reset Flow', () => {
    it('generates a 6-digit OTP and successfully resets password', async () => {
      const { otp } = await authService.requestPasswordReset('admin@stocksense.com');
      expect(otp).toHaveLength(6);

      // Reset password with the OTP
      await authService.resetPassword({
        identifier: 'admin@stocksense.com',
        otp,
        newPassword: 'BrandNewPass123!',
        confirmPassword: 'BrandNewPass123!',
      });

      // Verify login with new password succeeds
      const newLogin = await authService.login('admin@stocksense.com', 'BrandNewPass123!');
      expect(newLogin.user.email).toBe('admin@stocksense.com');

      // Verify old password fails
      await expect(authService.login('admin@stocksense.com', 'admin123')).rejects.toThrow(
        'Invalid Login Id or Password'
      );
    });
  });
});
