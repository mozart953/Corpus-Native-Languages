import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { prisma } from "./config/database.js";
import { routes } from "./routes/index.js";
import { globalLimiter } from "./middlewares/rate-limit.js";
import { errorHandler, notFound } from "./middlewares/error-handler.js";
import { asyncHandler } from "./utils/async-handler.js";

export const app = express();

app.disable("x-powered-by");

// Only trust proxy headers when the deployment actually has a proxy in front.
// Leaving this off in development keeps express-rate-limit's IP handling safe.
if (env.trustProxy) {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin server calls and curl have no Origin header.
      if (!origin || env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 86_400,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(globalLimiter);

const healthCheck = asyncHandler(async (_req, res) => {
  let database = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "unavailable";
  }

  const healthy = database === "ok";
  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    service: "corpus-native-languages-api",
    version: "v1",
    database,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", healthCheck);
app.get("/api/v1/health", healthCheck);

app.use("/api/v1", routes);

app.use(notFound);
app.use(errorHandler);
