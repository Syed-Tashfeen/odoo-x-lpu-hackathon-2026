import { type Request, type Response, type NextFunction } from "express";
import { verifyAccessToken, type TokenPayload } from "../lib/jwt.js";
import { ApiError } from "../lib/api-error.js";

/**
 * JWT authentication middleware.
 *
 * Extracts the Bearer token from the Authorization header,
 * verifies it, and attaches the decoded user to req.user.
 *
 * Usage:
 *   router.get("/me", authenticate, controller.getMe);
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Missing or invalid authorization header");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw ApiError.unauthorized("Token not provided");
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(ApiError.unauthorized("Invalid or expired token"));
    }
  }
}

/**
 * Role-based authorization middleware.
 *
 * Must be used AFTER authenticate middleware.
 *
 * Usage:
 *   router.delete("/users/:id", authenticate, authorize("admin"), controller.delete);
 *   router.get("/dashboard", authenticate, authorize("admin", "owner"), controller.dashboard);
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access denied. Required roles: ${allowedRoles.join(", ")}`
        )
      );
    }

    next();
  };
}

// Aliases matching hackathon specification
export const verifyToken = authenticate;
export const requireRole = authorize;
