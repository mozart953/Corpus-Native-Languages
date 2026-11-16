import { Router } from "express";
import { partOfSpeechController } from "../controllers/part-of-speech.controller.js";
import { requireAuth } from "../middlewares/auth.guard.js";
import { requireRole } from "../middlewares/role.guard.js";
import { validate } from "../middlewares/validate.js";
import { writeLimiter } from "../middlewares/rate-limit.js";
import {
  partOfSpeechCodeValidator,
  partOfSpeechCreateValidator,
  partOfSpeechReadValidator,
  partOfSpeechUpdateValidator,
} from "../validators/part-of-speech.validator.js";

export const partOfSpeechRoutes = Router();

// Public read: contributors need the active list, and word cards need each
// row's label in the visitor's language.
partOfSpeechRoutes.get(
  "/",
  partOfSpeechReadValidator,
  validate,
  partOfSpeechController.list,
);

// Admin read includes inactive rows and word counts. It must stay above the
// parameterised routes so "admin" is never treated as a code.
partOfSpeechRoutes.get(
  "/admin",
  requireAuth,
  requireRole("admin"),
  partOfSpeechReadValidator,
  validate,
  partOfSpeechController.listAdmin,
);

partOfSpeechRoutes.post(
  "/",
  requireAuth,
  requireRole("admin"),
  writeLimiter,
  partOfSpeechCreateValidator,
  validate,
  partOfSpeechController.create,
);

partOfSpeechRoutes.patch(
  "/:code",
  requireAuth,
  requireRole("admin"),
  writeLimiter,
  partOfSpeechUpdateValidator,
  validate,
  partOfSpeechController.update,
);

// "Delete" is a deactivation so existing words keep their label. A restore
// endpoint makes the option selectable again.
partOfSpeechRoutes.delete(
  "/:code",
  requireAuth,
  requireRole("admin"),
  writeLimiter,
  partOfSpeechCodeValidator,
  validate,
  partOfSpeechController.deactivate,
);

partOfSpeechRoutes.post(
  "/:code/restore",
  requireAuth,
  requireRole("admin"),
  writeLimiter,
  partOfSpeechCodeValidator,
  validate,
  partOfSpeechController.activate,
);
