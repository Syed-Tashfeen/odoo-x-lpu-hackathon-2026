import { Router } from "express";
import * as profileController from "./profile.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { verifyToken } from "../../middleware/auth.middleware.js";
import {
  updateProfileSchema,
  changePasswordSchema,
} from "./profile.schemas.js";

const router = Router();

// Authentication required for all profile & account management endpoints
router.use(verifyToken);

router.get("/", profileController.getProfile);

router.patch(
  "/",
  validate({ body: updateProfileSchema }),
  profileController.updateProfile
);

router.patch(
  "/password",
  validate({ body: changePasswordSchema }),
  profileController.changePassword
);

export default router;
