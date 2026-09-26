import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import { db } from "../../config/db.js";
import { users, otpCodes } from "../../db/schema/index.js";
import { hashPassword, comparePassword } from "../../lib/password.js";
import { generateTokenPair } from "../../lib/jwt.js";
import { sendOtpEmail } from "../../lib/mailer.js";
import { ApiError } from "../../lib/api-error.js";
import type { SafeUser, User } from "../../db/schema/users.js";

// ═══════════════════════════════════════════════════════════
// AUTH SERVICE — StockSense Authentication Business Logic
// ═══════════════════════════════════════════════════════════

/**
 * Strip sensitive fields (like passwordHash) from a user record.
 */
export function toSafeUser(user: User): SafeUser {
  const { passwordHash, ...safe } = user;
  return safe;
}

/**
 * Signup / Register a new user.
 */
export async function signup(data: {
  name: string;
  email: string;
  password: string;
  role?: "manager" | "staff";
}) {
  const normalizedEmail = data.email.toLowerCase().trim();

  // Check if email already taken
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing.length > 0) {
    throw ApiError.conflict("Email already registered");
  }

  // Hash password
  const hashedPassword = await hashPassword(data.password);

  // Insert user into PostgreSQL
  const [user] = await db
    .insert(users)
    .values({
      name: data.name.trim(),
      email: normalizedEmail,
      passwordHash: hashedPassword,
      role: data.role || "staff",
      isActive: true,
    })
    .returning();

  // Generate JWT access & refresh tokens
  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };
  const tokens = generateTokenPair(tokenPayload);

  return {
    user: toSafeUser(user),
    token: tokens.accessToken,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

// Keep register as alias for signup
export const register = signup;

/**
 * Login with email and password.
 */
export async function login(data: { email: string; password: string }) {
  const normalizedEmail = data.email.toLowerCase().trim();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  if (!user.isActive) {
    throw ApiError.forbidden("Account is deactivated");
  }

  const isValidPassword = await comparePassword(data.password, user.passwordHash);
  if (!isValidPassword) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  // Generate tokens
  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };
  const tokens = generateTokenPair(tokenPayload);

  return {
    user: toSafeUser(user),
    token: tokens.accessToken,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

/**
 * Forgot password — generate 6-digit OTP and store in otp_codes table.
 */
export async function forgotPassword(email: string) {
  const normalizedEmail = email.toLowerCase().trim();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  // Always return generic success to prevent email enumeration attacks
  if (!user) {
    return {
      message: "If an account with that email exists, an OTP has been sent.",
    };
  }

  // Invalidate any previously unused OTPs for this user
  await db
    .update(otpCodes)
    .set({ used: true })
    .where(and(eq(otpCodes.userId, user.id), eq(otpCodes.used, false)));

  // Generate secure 6-digit OTP code
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

  // Save to otp_codes table
  await db.insert(otpCodes).values({
    userId: user.id,
    code: otp,
    expiresAt,
    used: false,
  });

  // Send real email via Resend
  await sendOtpEmail(user.email, otp);

  // Log OTP clearly to console for local/hackathon testing
  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log(`║ 🔑 StockSense Password Reset OTP: [ ${otp} ]              ║`);
  console.log(`║ 📧 Recipient: ${user.email.padEnd(51)}║`);
  console.log(`║ ⏰ Valid until: ${expiresAt.toISOString().padEnd(49)}║`);
  console.log("╚══════════════════════════════════════════════════════════════════╝\n");

  return {
    message: "If an account with that email exists, an OTP has been sent.",
    // Note: In development mode, we can also return otp for convenience in automated tests
    ...(process.env.NODE_ENV !== "production" ? { devOtp: otp } : {}),
  };
}

/**
 * Reset password using 6-digit OTP.
 */
export async function resetPassword(data: {
  email: string;
  otp: string;
  newPassword: string;
}) {
  const normalizedEmail = data.email.toLowerCase().trim();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user) {
    throw ApiError.badRequest("Invalid email or OTP code");
  }

  // Find active, unused OTP that hasn't expired
  const [validOtp] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.userId, user.id),
        eq(otpCodes.code, data.otp),
        eq(otpCodes.used, false),
        gt(otpCodes.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!validOtp) {
    throw ApiError.badRequest("Invalid or expired OTP code");
  }

  // Mark OTP as used
  await db
    .update(otpCodes)
    .set({ used: true })
    .where(eq(otpCodes.id, validOtp.id));

  // Hash new password and update user record
  const hashedPassword = await hashPassword(data.newPassword);
  await db
    .update(users)
    .set({
      passwordHash: hashedPassword,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  return {
    message: "Password reset successfully. You can now login with your new password.",
  };
}

/**
 * Get current user by ID.
 */
export async function getMe(userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  return toSafeUser(user);
}
