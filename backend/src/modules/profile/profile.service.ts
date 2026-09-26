import { eq, and, ne } from "drizzle-orm";
import { db } from "../../config/db.js";
import { users } from "../../db/schema/index.js";
import { ApiError } from "../../lib/api-error.js";
import { hashPassword, comparePassword } from "../../lib/password.js";
import type { SafeUser } from "../../db/schema/users.js";

function toSafeUser(user: typeof users.$inferSelect): SafeUser {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

/**
 * Get current user profile by user ID.
 */
export async function getProfile(userId: string): Promise<SafeUser> {
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

/**
 * Update current user name or email.
 */
export async function updateProfile(
  userId: string,
  data: { name?: string; email?: string }
): Promise<SafeUser> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  const updates: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) {
    updates.name = data.name.trim();
  }

  if (data.email !== undefined) {
    const normalizedEmail = data.email.toLowerCase().trim();

    // Check if another user already has this email
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, normalizedEmail), ne(users.id, userId)))
      .limit(1);

    if (existing) {
      throw ApiError.conflict("Email address is already in use by another account");
    }

    updates.email = normalizedEmail;
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId))
    .returning();

  return toSafeUser(updated);
}

/**
 * Change current user password.
 */
export async function changePassword(
  userId: string,
  data: { currentPassword: string; newPassword: string }
): Promise<{ message: string }> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  // 1. Verify current password
  const isValid = await comparePassword(data.currentPassword, user.passwordHash);
  if (!isValid) {
    throw ApiError.badRequest("Current password is incorrect");
  }

  // 2. Ensure new password is not identical to current
  if (data.currentPassword === data.newPassword) {
    throw ApiError.badRequest("New password must be different from current password");
  }

  // 3. Hash new password and save
  const newHash = await hashPassword(data.newPassword);

  await db
    .update(users)
    .set({
      passwordHash: newHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return {
    message: "Password changed successfully",
  };
}
