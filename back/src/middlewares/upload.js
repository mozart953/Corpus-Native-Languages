import { randomUUID } from "node:crypto";
import path from "node:path";
import multer from "multer";
import { ApiError } from "../utils/ApiError.js";
import { uploadDir, uploadMaxBytes } from "../config/uploads.js";

const MIME_EXTENSIONS = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    const extension = MIME_EXTENSIONS.get(file.mimetype) ?? ".img";
    callback(null, `${Date.now()}-${randomUUID()}${extension}`);
  },
});

function fileFilter(_req, file, callback) {
  if (!MIME_EXTENSIONS.has(file.mimetype)) {
    return callback(
      new ApiError(
        400,
        "Use a PNG, JPEG, WebP or GIF image.",
        { code: "INVALID_IMAGE_TYPE" },
      ),
    );
  }

  return callback(null, true);
}

export const homeImageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: uploadMaxBytes,
    files: 1,
  },
});

/**
 * MIME headers are supplied by the client, so check the bytes before accepting
 * an upload. The extension is already controlled by the server.
 */
export async function assertImageSignature(filePath, mimeType) {
  const { open } = await import("node:fs/promises");
  const handle = await open(filePath, "r");
  const buffer = Buffer.alloc(12);

  try {
    await handle.read(buffer, 0, buffer.length, 0);
  } finally {
    await handle.close();
  }

  const isPng =
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isGif =
    buffer.subarray(0, 6).toString("ascii") === "GIF87a" ||
    buffer.subarray(0, 6).toString("ascii") === "GIF89a";
  const isWebp =
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP";

  const valid =
    (mimeType === "image/png" && isPng) ||
    (mimeType === "image/jpeg" && isJpeg) ||
    (mimeType === "image/gif" && isGif) ||
    (mimeType === "image/webp" && isWebp);

  if (!valid) {
    throw new ApiError(
      400,
      "That file does not look like a valid image.",
      { code: "INVALID_IMAGE_FILE" },
    );
  }
}

/** Resolve a stored filename inside the upload directory, refusing traversal. */
export function resolveStoredFile(fileName) {
  const safeName = path.basename(String(fileName ?? ""));
  if (!safeName || safeName !== fileName) return null;

  const fullPath = path.join(uploadDir, safeName);
  if (path.dirname(fullPath) !== uploadDir) return null;
  return fullPath;
}
