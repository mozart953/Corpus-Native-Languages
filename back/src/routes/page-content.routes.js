import { Router } from "express";
import { pageContentController } from "../controllers/page-content.controller.js";
import { requireAuth } from "../middlewares/auth.guard.js";
import { requireRole } from "../middlewares/role.guard.js";
import { validate } from "../middlewares/validate.js";
import { writeLimiter } from "../middlewares/rate-limit.js";
import {
  pageContentKeyResetValidator,
  pageContentReadValidator,
  pageContentResetValidator,
  pageContentSaveValidator,
} from "../validators/page-content.validator.js";

export const pageContentRoutes = Router();

// Public read: every visitor needs the copy for their selected locale. The
// response also lists the active locales so the toggle is data-driven.
pageContentRoutes.get(
  "/:locale",
  pageContentReadValidator,
  validate,
  pageContentController.getPublic,
);

// Admin editor: includes defaults and stored overrides, never cached publicly.
pageContentRoutes.get(
  "/:locale/admin",
  requireAuth,
  requireRole("admin"),
  pageContentReadValidator,
  validate,
  pageContentController.getAdmin,
);

pageContentRoutes.put(
  "/:locale",
  requireAuth,
  requireRole("admin"),
  writeLimiter,
  pageContentSaveValidator,
  validate,
  pageContentController.save,
);

pageContentRoutes.delete(
  "/:locale",
  requireAuth,
  requireRole("admin"),
  writeLimiter,
  pageContentResetValidator,
  validate,
  pageContentController.resetAll,
);

pageContentRoutes.delete(
  "/:locale/keys/:key",
  requireAuth,
  requireRole("admin"),
  writeLimiter,
  pageContentKeyResetValidator,
  validate,
  pageContentController.resetKey,
);
