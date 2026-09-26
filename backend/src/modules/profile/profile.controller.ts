import { type Request, type Response, type NextFunction } from "express";
import * as profileService from "./profile.service.js";

/**
 * GET /api/me
 * Retrieve current user profile.
 */
export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await profileService.getProfile(req.user!.id);
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/me
 * Update current user name or email.
 */
export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const updated = await profileService.updateProfile(req.user!.id, req.body);
    res.json({
      success: true,
      message: "Profile updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/me/password
 * Change current user password.
 */
export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await profileService.changePassword(req.user!.id, req.body);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}
