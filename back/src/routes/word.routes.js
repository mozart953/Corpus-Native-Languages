import { Router } from "express";
import { wordController } from "../controllers/word.controller.js";
import { requireAuth } from "../middlewares/auth.guard.js";
import { requireRole } from "../middlewares/role.guard.js";
import { validate } from "../middlewares/validate.js";
import { reviewLimiter, writeLimiter } from "../middlewares/rate-limit.js";
import {
  wordCreateValidator,
  wordDeleteValidator,
  wordIdValidator,
  wordListMineValidator,
  wordQueryValidator,
  wordRestoreValidator,
  wordUpdateValidator,
} from "../validators/word.validator.js";
import { reviewValidator } from "../validators/review.validator.js";

export const wordRoutes = Router();

// Public reads -------------------------------------------------------------
wordRoutes.get("/", wordQueryValidator, validate, wordController.list);
wordRoutes.get("/mine", requireAuth, wordListMineValidator, validate, wordController.listMine);
wordRoutes.get("/:id", wordIdValidator, validate, wordController.get);

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

wordRoutes.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  writeLimiter,
  wordDeleteValidator,
  validate,
  wordController.remove,
);

wordRoutes.post(
  "/:id/restore",
  requireAuth,
  requireRole("admin"),
  writeLimiter,
  wordRestoreValidator,
  validate,
  wordController.restore,
);
