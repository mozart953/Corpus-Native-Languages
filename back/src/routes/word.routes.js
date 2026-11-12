import { Router } from "express";
import { wordController } from "../controllers/word.controller.js";
import { requireAuth } from "../middlewares/auth.guard.js";
import { requireRole } from "../middlewares/role.guard.js";
import { validate } from "../middlewares/validate.js";
import { reviewLimiter, writeLimiter } from "../middlewares/rate-limit.js";
import {
  wordCreateValidator,
  wordDeleteValidator,
  wordGetValidator,
  wordIdValidator,
  wordListMineValidator,
  wordQueryValidator,
  wordRestoreValidator,
  wordTranslationDeleteValidator,
  wordTranslationValidator,
  wordUpdateValidator,
} from "../validators/word.validator.js";
import { reviewValidator } from "../validators/review.validator.js";

export const wordRoutes = Router();

// Public reads -------------------------------------------------------------
wordRoutes.get("/", wordQueryValidator, validate, wordController.list);

// Sign-in-only views. `/trash` and `/mine` must stay above `/:id`.
wordRoutes.get("/mine", requireAuth, wordListMineValidator, validate, wordController.listMine);
wordRoutes.get("/trash", requireAuth, wordListMineValidator, validate, wordController.listTrash);
wordRoutes.get("/:id", wordGetValidator, validate, wordController.get);

// Authenticated writes -----------------------------------------------------
wordRoutes.post(
  "/",
  requireAuth,
  requireRole("contributor", "reviewer", "admin"),
  writeLimiter,
  wordCreateValidator,
  validate,
  wordController.create,
);

wordRoutes.put(
  "/:id",
  requireAuth,
  requireRole("contributor", "reviewer", "admin"),
  writeLimiter,
  wordUpdateValidator,
  validate,
  wordController.update,
);

wordRoutes.patch(
  "/:id",
  requireAuth,
  requireRole("contributor", "reviewer", "admin"),
  writeLimiter,
  wordUpdateValidator,
  validate,
  wordController.update,
);

// Per-locale translations. Reviewers and admins maintain these; contributors
// edit the canonical English fields through the regular word update.
wordRoutes.put(
  "/:id/translations/:locale",
  requireAuth,
  requireRole("reviewer", "admin"),
  writeLimiter,
  wordTranslationValidator,
  validate,
  wordController.saveTranslation,
);

wordRoutes.delete(
  "/:id/translations/:locale",
  requireAuth,
  requireRole("reviewer", "admin"),
  writeLimiter,
  wordTranslationDeleteValidator,
  validate,
  wordController.deleteTranslation,
);

// Draft lifecycle ----------------------------------------------------------
wordRoutes.post(
  "/:id/submit",
  requireAuth,
  requireRole("contributor", "reviewer", "admin"),
  writeLimiter,
  wordIdValidator,
  validate,
  wordController.submit,
);

// Moderation ---------------------------------------------------------------
wordRoutes.post(
  "/:id/review",
  requireAuth,
  requireRole("reviewer", "admin"),
  reviewLimiter,
  wordIdValidator,
  reviewValidator,
  validate,
  wordController.review,
);

wordRoutes.post(
  "/:id/removal-request",
  requireAuth,
  requireRole("reviewer", "admin"),
  reviewLimiter,
  wordDeleteValidator,
  validate,
  wordController.requestRemoval,
);

wordRoutes.delete(
  "/:id/removal-request",
  requireAuth,
  requireRole("reviewer", "admin"),
  reviewLimiter,
  wordIdValidator,
  validate,
  wordController.cancelRemovalRequest,
);

// Admin removes; a contributor may discard only their own draft. The service
// enforces the distinction.
wordRoutes.delete(
  "/:id",
  requireAuth,
  requireRole("contributor", "reviewer", "admin"),
  writeLimiter,
  wordDeleteValidator,
  validate,
  wordController.remove,
);

// Admin restores removed content; an owner restores a trashed draft.
wordRoutes.post(
  "/:id/restore",
  requireAuth,
  requireRole("contributor", "reviewer", "admin"),
  writeLimiter,
  wordRestoreValidator,
  validate,
  wordController.restore,
);
