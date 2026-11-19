import { Router } from "express";
import { siteImageController } from "../controllers/site-image.controller.js";
import { requireAuth } from "../middlewares/auth.guard.js";
import { requireRole } from "../middlewares/role.guard.js";
import { validate } from "../middlewares/validate.js";
import { writeLimiter } from "../middlewares/rate-limit.js";
import { homeImageUpload } from "../middlewares/upload.js";
import { homeImageUpdateValidator } from "../validators/site-image.validator.js";

export const siteImageRoutes = Router();

// Public read: every visitor needs the image chosen by the admin.
siteImageRoutes.get("/home-image", siteImageController.getHomeImage);

// Admin-only writes. The public home page never exposes these controls.
siteImageRoutes.put(
  "/home-image",
  requireAuth,
  requireRole("admin"),
  writeLimiter,
  homeImageUpload.single("image"),
  homeImageUpdateValidator,
  validate,
  siteImageController.uploadHomeImage,
);

siteImageRoutes.delete(
  "/home-image",
  requireAuth,
  requireRole("admin"),
  writeLimiter,
  siteImageController.removeHomeImage,
);
