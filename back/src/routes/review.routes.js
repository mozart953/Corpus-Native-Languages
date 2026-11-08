import { Router } from "express";
import { reviewController } from "../controllers/review.controller.js";
import { requireAuth } from "../middlewares/auth.guard.js";
import { requireRole } from "../middlewares/role.guard.js";
import { validate } from "../middlewares/validate.js";
import {
  reviewHistoryValidator,
  reviewQueueValidator,
} from "../validators/review.validator.js";

export const reviewRoutes = Router();

reviewRoutes.get(
  "/queue",
  requireAuth,
  requireRole("reviewer", "admin"),
  reviewQueueValidator,
  validate,
  reviewController.queue,
);

reviewRoutes.get(
  "/history",
  requireAuth,
  requireRole("reviewer", "admin"),
  reviewHistoryValidator,
  validate,
  reviewController.history,
);
