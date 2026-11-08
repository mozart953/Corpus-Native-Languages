import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.guard.js";
import { validate } from "../middlewares/validate.js";
import { authLimiter } from "../middlewares/rate-limit.js";
import {
  loginValidator,
  registerValidator,
} from "../validators/auth.validator.js";

export const authRoutes = Router();

authRoutes.post(
  "/register",
  authLimiter,
  registerValidator,
  validate,
  authController.register,
);

authRoutes.post(
  "/login",
  authLimiter,
  loginValidator,
  validate,
  authController.login,
);

authRoutes.get("/me", requireAuth, authController.me);
