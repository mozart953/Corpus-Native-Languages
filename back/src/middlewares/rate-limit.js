import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

function handler(message) {
  return (_req, res) => {
    res.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message,
      },
    });
  };
}

const common = {
  windowMs: FIFTEEN_MINUTES,
  standardHeaders: true,
  legacyHeaders: false,
  // Tests can disable the limiter without changing production defaults.
  skip: () => env.nodeEnv === "test",
};

/** Broad protection for every request. */
export const globalLimiter = rateLimit({
  ...common,
  limit: 300,
  handler: handler("Too many requests. Please try again in a few minutes."),
});

/** Login and registration are the most attractive endpoints to brute force. */
export const authLimiter = rateLimit({
  ...common,
  limit: env.nodeEnv === "production" ? 10 : 100,
  handler: handler("Too many sign-in attempts. Please wait a few minutes and try again."),
});

/** Writes are more expensive than reads and should not be scripted in bulk. */
export const writeLimiter = rateLimit({
  ...common,
  limit: 60,
  handler: handler("Too many write requests. Please slow down."),
});

/** Reviews touch moderation state; keep the volume modest. */
export const reviewLimiter = rateLimit({
  ...common,
  limit: 120,
  handler: handler("Too many review requests. Please slow down."),
});
