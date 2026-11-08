import "dotenv/config";

function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function integer(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer.`);
  }
  return value;
}

const authSecret = required("AUTH_SECRET");
if (authSecret.length < 32) {
  throw new Error("AUTH_SECRET must be at least 32 characters long.");
}

const nodeEnv = process.env.NODE_ENV ?? "development";

export const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: integer("PORT", 4000),
  databaseUrl: required("DATABASE_URL"),
  authSecret,
  authCookieName: process.env.AUTH_COOKIE_NAME?.trim() || "corpus.session-token",
  authSessionMaxAge: integer("AUTH_SESSION_MAX_AGE", 30 * 60),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  trustProxy: process.env.TRUST_PROXY === "true",
  seed: {
    admin: {
      email: process.env.SEED_ADMIN_EMAIL ?? "admin@corpus.local",
      username: process.env.SEED_ADMIN_USERNAME ?? "Corpus Admin",
      password: process.env.SEED_ADMIN_PASSWORD ?? "Admin123!",
    },
    reviewer: {
      email: process.env.SEED_REVIEWER_EMAIL ?? "reviewer@corpus.local",
      username: process.env.SEED_REVIEWER_USERNAME ?? "Corpus Reviewer",
      password: process.env.SEED_REVIEWER_PASSWORD ?? "Reviewer123!",
    },
    contributor: {
      email: process.env.SEED_CONTRIBUTOR_EMAIL ?? "contributor@corpus.local",
      username: process.env.SEED_CONTRIBUTOR_USERNAME ?? "Corpus Contributor",
      password: process.env.SEED_CONTRIBUTOR_PASSWORD ?? "Contributor123!",
    },
  },
});
