import { Router } from "express";
import * as authController from "./auth.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { verifyToken, requireRole } from "../../middleware/auth.middleware.js";
import {
  signupSchema,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.schemas.js";

const router = Router();

// ── Public routes ──────────────────────────────────────────
// Both /signup and /register supported
router.post("/signup", validate({ body: signupSchema }), authController.signup);
router.post("/register", validate({ body: registerSchema }), authController.register);
router.post("/login", validate({ body: loginSchema }), authController.login);
router.post(
  "/forgot-password",
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword
);
router.post(
  "/reset-password",
  validate({ body: resetPasswordSchema }),
  authController.resetPassword
);

// ── Protected routes ───────────────────────────────────────
router.get("/me", verifyToken, authController.getMe);
router.get(
  "/manager-only",
  verifyToken,
  requireRole("manager"),
  (_req, res) => {
    res.json({ success: true, message: "Welcome manager!" });
  }
);

export default router;
