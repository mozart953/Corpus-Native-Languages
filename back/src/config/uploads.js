import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Uploaded files live outside `src` so a redeploy that replaces the source
 * tree can still keep them on a mounted volume. `UPLOAD_DIR` makes that
 * location configurable in production.
 */
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export const uploadDir = process.env.UPLOAD_DIR?.trim()
  ? path.resolve(process.env.UPLOAD_DIR.trim())
  : path.join(projectRoot, "uploads");

/** Public prefix relative to the API root (`/api/v1`). */
export const uploadUrlPrefix = "/uploads";

export const uploadMaxBytes = 5 * 1024 * 1024;

fs.mkdirSync(uploadDir, { recursive: true });
