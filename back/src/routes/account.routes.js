import { Router } from "express";
import { accountController } from "../controllers/account.controller.js";
import { requireAuth } from "../middlewares/auth.guard.js";
import { requireRole } from "../middlewares/role.guard.js";
import { validate } from "../middlewares/validate.js";
import { writeLimiter } from "../middlewares/rate-limit.js";
import {
  accountEmailValidator,
  accountPasswordValidator,
  accountRequestCreateValidator,
  accountRequestIdValidator,
  accountRequestListValidator,
  accountUsernameValidator,
  adminAccountUpdateValidator,
} from "../validators/account.validator.js";

export const accountRoutes = Router();

// Every account endpoint needs a signed-in, active user. Admin-only handlers
// add a role guard on top of this.
accountRoutes.use(requireAuth);

// Self-service account management.
accountRoutes.get("/", accountController.get);

accountRoutes.patch(
  "/username",
  writeLimiter,
  accountUsernameValidator,
  validate,
  accountController.changeUsername,
);

accountRoutes.patch(
  "/email",
  writeLimiter,
  accountEmailValidator,
  validate,
  accountController.changeEmail,
);

accountRoutes.patch(
  "/password",
  writeLimiter,
  accountPasswordValidator,
  validate,
  accountController.changePassword,
);

// Emergency request workflow for a locked-out or unreachable user.
accountRoutes.get("/requests", accountController.listOwnRequests);

accountRoutes.post(
  "/requests",
  writeLimiter,
  accountRequestCreateValidator,
  validate,
  accountController.createRequest,
);

accountRoutes.post(
  "/requests/:id/cancel",
  writeLimiter,
  accountRequestIdValidator,
  validate,
  accountController.cancelRequest,
);

// Admin-assisted changes. Keeping these under /account makes it explicit that
// they are the emergency exception, not a general account editor.
accountRoutes.get(
  "/admin/requests",
  requireRole("admin"),
  accountRequestListValidator,
  validate,
  accountController.listRequests,
);

accountRoutes.patch(
  "/admin/users/:id",
  requireRole("admin"),
  writeLimiter,
  adminAccountUpdateValidator,
  validate,
  accountController.adminUpdateUser,
);
