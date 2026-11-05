import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { requireAuth } from "../middlewares/auth.guard.js";
import { requireRole } from "../middlewares/role.guard.js";
import { validate } from "../middlewares/validate.js";
import {
  userListValidator,
  userRoleValidator,
} from "../validators/user.validator.js";

export const userRoutes = Router();

userRoutes.get(
  "/",
  requireAuth,
  requireRole("admin"),
  userListValidator,
  validate,
  userController.list,
);

userRoutes.patch(
  "/:id/role",
  requireAuth,
  requireRole("admin"),
  userRoleValidator,
  validate,
  userController.updateRole,
);
