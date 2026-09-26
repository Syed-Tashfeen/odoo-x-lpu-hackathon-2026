import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { registry } from "../../config/swagger.js";

// Extend Zod with OpenAPI methods
extendZodWithOpenApi(z);

// ═══════════════════════════════════════════════════════════
// REQUEST SCHEMAS
// ═══════════════════════════════════════════════════════════

export const signupSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .openapi({ example: "John Doe" }),
    email: z
      .string()
      .email("Invalid email format")
      .openapi({ example: "john@example.com" }),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .openapi({ example: "securepassword123" }),
    role: z
      .enum(["manager", "staff"])
      .optional()
      .default("staff")
      .openapi({ example: "staff" }),
  })
  .openapi("SignupRequest");

export const registerSchema = signupSchema;

export const loginSchema = z
  .object({
    email: z
      .string()
      .email("Invalid email format")
      .openapi({ example: "john@example.com" }),
    password: z
      .string()
      .min(1, "Password is required")
      .openapi({ example: "securepassword123" }),
  })
  .openapi("LoginRequest");

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  })
  .openapi("RefreshRequest");

export const forgotPasswordSchema = z
  .object({
    email: z
      .string()
      .email("Invalid email format")
      .openapi({ example: "john@example.com" }),
  })
  .openapi("ForgotPasswordRequest");

export const resetPasswordSchema = z
  .object({
    email: z
      .string()
      .email("Invalid email format")
      .openapi({ example: "john@example.com" }),
    otp: z
      .string()
      .length(6, "OTP must be exactly 6 digits")
      .regex(/^\d{6}$/, "OTP must contain only numbers")
      .openapi({ example: "123456" }),
    newPassword: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .openapi({ example: "newSecurePassword456" }),
  })
  .openapi("ResetPasswordRequest");

// ═══════════════════════════════════════════════════════════
// RESPONSE SCHEMAS
// ═══════════════════════════════════════════════════════════

export const safeUserResponseSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    role: z.enum(["manager", "staff"]),
    isActive: z.boolean(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  })
  .openapi("SafeUser");

export const authResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
    data: z.object({
      user: safeUserResponseSchema,
      token: z.string(),
      accessToken: z.string().optional(),
      refreshToken: z.string().optional(),
    }),
  })
  .openapi("AuthResponse");

export const messageResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
  })
  .openapi("MessageResponse");

// ═══════════════════════════════════════════════════════════
// SWAGGER ROUTE REGISTRATIONS
// ═══════════════════════════════════════════════════════════

registry.registerPath({
  method: "post",
  path: "/auth/signup",
  tags: ["Auth"],
  summary: "Register/Signup a new user",
  request: { body: { content: { "application/json": { schema: signupSchema } } } },
  responses: {
    201: { description: "User registered successfully", content: { "application/json": { schema: authResponseSchema } } },
    409: { description: "Email already exists" },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Login with email and password",
  request: { body: { content: { "application/json": { schema: loginSchema } } } },
  responses: {
    200: { description: "Login successful", content: { "application/json": { schema: authResponseSchema } } },
    401: { description: "Invalid credentials" },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/forgot-password",
  tags: ["Auth"],
  summary: "Request 6-digit OTP for password reset",
  request: { body: { content: { "application/json": { schema: forgotPasswordSchema } } } },
  responses: {
    200: { description: "OTP sent / logged successfully", content: { "application/json": { schema: messageResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/reset-password",
  tags: ["Auth"],
  summary: "Reset password using 6-digit OTP",
  request: { body: { content: { "application/json": { schema: resetPasswordSchema } } } },
  responses: {
    200: { description: "Password reset successfully", content: { "application/json": { schema: messageResponseSchema } } },
    400: { description: "Invalid or expired OTP" },
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/me",
  tags: ["Auth"],
  summary: "Get current authenticated user profile",
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: "Current user profile",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: safeUserResponseSchema,
          }),
        },
      },
    },
    401: { description: "Unauthorized" },
  },
});
