import { Router } from "express";
import { languageController } from "../controllers/language.controller.js";
import { requireAuth } from "../middlewares/auth.guard.js";
import { requireRole } from "../middlewares/role.guard.js";
import { validate } from "../middlewares/validate.js";
import { reviewLimiter, writeLimiter } from "../middlewares/rate-limit.js";
import {
  languageCreateValidator,
  languageDeleteValidator,
  languageIdValidator,
  languageListMineValidator,
  languageQueryValidator,
  languageRestoreValidator,
  languageUpdateValidator,
} from "../validators/language.validator.js";
import { reviewValidator } from "../validators/review.validator.js";

export const languageRoutes = Router();

// Public reads -------------------------------------------------------------
languageRoutes.get("/", languageQueryValidator, validate, languageController.list);

// Sign-in-only views. `/trash` and `/mine` must stay above `/:id`.
languageRoutes.get(
  "/mine",
  requireAuth,
  languageListMineValidator,
  validate,
  languageController.listMine,
);
languageRoutes.get(
  "/trash",
  requireAuth,
  languageListMineValidator,
  validate,
  languageController.listTrash,
);
languageRoutes.get("/:id", languageIdValidator, validate, languageController.get);

// Authenticated writes -----------------------------------------------------
languageRoutes.post(
  "/",
  requireAuth,
  requireRole("contributor", "reviewer", "admin"),
  writeLimiter,
  languageCreateValidator,
  validate,
  languageController.create,
);

languageRoutes.put(
  "/:id",
  requireAuth,
  requireRole("contributor", "reviewer", "admin"),
  writeLimiter,
  languageUpdateValidator,
  validate,
  languageController.update,
);

languageRoutes.patch(
  "/:id",
  requireAuth,
  requireRole("contributor", "reviewer", "admin"),
  writeLimiter,
  languageUpdateValidator,
  validate,
  languageController.update,
);

// Draft lifecycle ----------------------------------------------------------
languageRoutes.post(
  "/:id/submit",
  requireAuth,
  requireRole("contributor", "reviewer", "admin"),
  writeLimiter,
  languageIdValidator,
  validate,
  languageController.submit,
);

// Moderation ---------------------------------------------------------------
languageRoutes.post(
  "/:id/review",
  requireAuth,
  requireRole("reviewer", "admin"),
  reviewLimiter,
  languageIdValidator,
  reviewValidator,
  validate,
  languageController.review,
);

languageRoutes.post(
  "/:id/removal-request",
  requireAuth,
  requireRole("reviewer", "admin"),
  reviewLimiter,
  languageDeleteValidator,
  validate,
  languageController.requestRemoval,
);

languageRoutes.delete(
  "/:id/removal-request",
  requireAuth,
  requireRole("reviewer", "admin"),
  reviewLimiter,
  languageIdValidator,
  validate,
  languageController.cancelRemovalRequest,
);

// Admin removes; a contributor may discard only their own draft.
languageRoutes.delete(
  "/:id",
  requireAuth,
  requireRole("contributor", "reviewer", "admin"),
  writeLimiter,
  languageDeleteValidator,
  validate,
  languageController.remove,
);

// Admin restores removed content; an owner restores a trashed draft.
languageRoutes.post(
  "/:id/restore",
  requireAuth,
  requireRole("contributor", "reviewer", "admin"),
  writeLimiter,
  languageRestoreValidator,
  validate,
  languageController.restore,
);
