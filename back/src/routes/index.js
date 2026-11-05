import { Router } from "express";
import { authRoutes } from "./auth.routes.js";
import { languageRoutes } from "./language.routes.js";
import { wordRoutes } from "./word.routes.js";
import { reviewRoutes } from "./review.routes.js";
import { userRoutes } from "./user.routes.js";
import { auditRoutes } from "./audit.routes.js";

export const routes = Router();

routes.get("/", (_req, res) => {
  res.json({
    name: "Native Languages Corpus API",
    version: "v1",
    documentation: "See back/README.md",
    endpoints: {
      health: "/api/v1/health",
      auth: "/api/v1/auth",
      languages: "/api/v1/languages",
      words: "/api/v1/words",
      reviews: "/api/v1/reviews",
      users: "/api/v1/users",
      audit: "/api/v1/audit",
    },
  });
});

routes.use("/auth", authRoutes);
routes.use("/languages", languageRoutes);
routes.use("/words", wordRoutes);
routes.use("/reviews", reviewRoutes);
routes.use("/users", userRoutes);
routes.use("/audit", auditRoutes);
