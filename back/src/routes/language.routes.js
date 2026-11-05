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
languageRoutes.get("/mine", requireAuth, languageListMineValidator, validate, languageController.listMine);
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

languageRoutes.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  writeLimiter,
  languageDeleteValidator,
  validate,
  languageController.remove,
);

languageRoutes.post(
  "/:id/restore",
  requireAuth,
  requireRole("admin"),
  writeLimiter,
  languageRestoreValidator,
  validate,
  languageController.restore,
);
