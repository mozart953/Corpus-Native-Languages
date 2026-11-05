import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

// Keep a single Prisma client alive across hot reloads in development. Prisma
// opens a pool per client, so creating a new one on every module reload is a
// common source of "too many connections" errors.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__corpusPrisma ??
  new PrismaClient({
    log: env.isProduction ? ["error"] : ["warn", "error"],
  });

if (!env.isProduction) {
  globalForPrisma.__corpusPrisma = prisma;
}
