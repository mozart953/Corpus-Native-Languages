import { Router } from "express";
import { archiveController } from "../controllers/archive.controller.js";
import { requireAuth } from "../middlewares/auth.guard.js";
import { requireRole } from "../middlewares/role.guard.js";
import { validate } from "../middlewares/validate.js";
import { archiveListValidator } from "../validators/archive.validator.js";

export const archiveRoutes = Router();

archiveRoutes.get(
  "/",
  requireAuth,
  requireRole("admin"),
  archiveListValidator,
  validate,
  archiveController.list,
);
