import { Router } from "express";
import { auditController } from "../controllers/audit.controller.js";
import { requireAuth } from "../middlewares/auth.guard.js";
import { requireRole } from "../middlewares/role.guard.js";
import { validate } from "../middlewares/validate.js";
import { auditListValidator } from "../validators/audit.validator.js";

export const auditRoutes = Router();

auditRoutes.get(
  "/",
  requireAuth,
  requireRole("admin"),
  auditListValidator,
  validate,
  auditController.list,
);
