import { ApiError } from "../utils/ApiError.js";

/**
 * Require one of the given roles. Must run after `requireAuth`.
 *
 * Roles are deliberately simple strings so new ones can be added without a
 * database migration: contributor, reviewer, admin.
 */
export function requireRole(...roles) {
  return function roleGuard(req, _res, next) {
    if (!req.user) return next(ApiError.unauthorized());

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `This action requires one of these roles: ${roles.join(", ")}.`,
        ),
      );
    }

    next();
  };
}
