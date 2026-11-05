import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/database.js";

const server = app.listen(env.port, () => {
  console.log(`[api] Native Languages API listening on http://localhost:${env.port}`);
  console.log(`[api] Environment: ${env.nodeEnv}`);
  console.log(`[api] Public health check: http://localhost:${env.port}/api/v1/health`);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[api] ${signal} received, shutting down...`);

  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log("[api] Closed database connection.");
      process.exit(0);
    } catch (error) {
      console.error("[api] Error during shutdown:", error);
      process.exit(1);
    }
  });

  // Do not let a hung connection keep the process alive forever.
  setTimeout(() => {
    console.error("[api] Forced shutdown after timeout.");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("[api] Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[api] Uncaught exception:", error);
  process.exit(1);
});
