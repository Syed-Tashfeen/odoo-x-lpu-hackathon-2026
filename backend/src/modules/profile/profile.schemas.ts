import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { registry } from "../../config/swagger.js";

extendZodWithOpenApi(z);

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(255, "Name cannot exceed 255 characters")
      .optional(),
    email: z.string().email("Invalid email address format").optional(),
  })
  .refine((data) => data.name !== undefined || data.email !== undefined, {
    message: "At least one field (name or email) must be provided for update",
  })
  .openapi("UpdateProfileRequest");

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(6, "Current password must be at least 6 characters"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
  })
  .openapi("ChangePasswordRequest");

// ═══════════════════════════════════════════════════════════
// SWAGGER PATH REGISTRATIONS
// ═══════════════════════════════════════════════════════════

registry.registerPath({
  method: "get",
  path: "/me",
  tags: ["Profile"],
  summary: "Get current authenticated user profile",
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: "User profile data (excluding password hash)",
    },
    401: { description: "Unauthorized" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/me",
  tags: ["Profile"],
  summary: "Update current user name or email",
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: updateProfileSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated user profile",
    },
    400: { description: "Validation error or invalid request" },
    401: { description: "Unauthorized" },
    409: { description: "Email already in use" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/me/password",
  tags: ["Profile"],
  summary: "Change current user password",
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: changePasswordSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Password changed successfully",
    },
    400: { description: "Incorrect current password or invalid new password" },
    401: { description: "Unauthorized" },
  },
});
