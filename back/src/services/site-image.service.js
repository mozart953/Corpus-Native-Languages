import { unlink } from "node:fs/promises";
import { ApiError } from "../utils/ApiError.js";
import { siteImageRepository } from "../repositories/site-image.repository.js";
import { auditService } from "./audit.service.js";
import {
  assertImageSignature,
  resolveStoredFile,
} from "../middlewares/upload.js";
import { uploadUrlPrefix } from "../config/uploads.js";

const HOME_IMAGE_KEY = "home-hero";

function toPublic(row) {
  if (!row) return null;

  return {
    url: row.url,
    alt: row.alt,
    mimeType: row.mimeType,
    size: row.size,
    updatedAt: row.updatedAt,
  };
}

async function removeStoredFile(fileName) {
  const fullPath = resolveStoredFile(fileName);
  if (!fullPath) return;

  try {
    await unlink(fullPath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn("[api] Could not remove site image file:", error.message);
    }
  }
}

async function recordAudit(action, actor, snapshot) {
  try {
    await auditService.record({
      entityType: "site_image",
      entityId: HOME_IMAGE_KEY,
      action,
      actor,
      snapshot,
    });
  } catch (error) {
    // The image is already stored; a log failure should not undo that.
    console.warn("[api] Could not write site image audit entry:", error.message);
  }
}

export const siteImageService = {
  async getHomeImage() {
    return toPublic(await siteImageRepository.findByKey(HOME_IMAGE_KEY));
  },

  async saveHomeImage({ file, alt = null, actor = null }) {
    if (!file) {
      const existing = await siteImageRepository.findByKey(HOME_IMAGE_KEY);
      if (!existing) {
        throw ApiError.badRequest("Choose an image to upload.");
      }

      const saved = await siteImageRepository.update({
        key: HOME_IMAGE_KEY,
        data: { alt: alt?.trim() || null },
      });

      await recordAudit("home_image_alt_updated", actor, {
        url: saved.url,
        alt: saved.alt,
      });

      return toPublic(saved);
    }

    try {
      await assertImageSignature(file.path, file.mimetype);
    } catch (error) {
      await removeStoredFile(file.filename);
      throw error;
    }

    const previous = await siteImageRepository.findByKey(HOME_IMAGE_KEY);
    const id = HOME_IMAGE_KEY;

    let saved;
    try {
      saved = await siteImageRepository.upsert({
        key: id,
        data: {
          url: `${uploadUrlPrefix}/${file.filename}`,
          fileName: file.filename,
          mimeType: file.mimetype,
          size: file.size,
          alt: alt?.trim() || null,
          updatedById: actor?.id ?? null,
        },
      });
    } catch (error) {
      await removeStoredFile(file.filename);
      throw error;
    }

    if (previous && previous.fileName !== saved.fileName) {
      await removeStoredFile(previous.fileName);
    }

    await recordAudit(previous ? "home_image_replaced" : "home_image_added", actor, {
      url: saved.url,
      alt: saved.alt,
      mimeType: saved.mimeType,
      size: saved.size,
      previousUrl: previous?.url ?? null,
    });

    return toPublic(saved);
  },

  async removeHomeImage({ actor = null } = {}) {
    const previous = await siteImageRepository.findByKey(HOME_IMAGE_KEY);
    if (!previous) return { removed: false };

    await siteImageRepository.deleteByKey(HOME_IMAGE_KEY);
    await removeStoredFile(previous.fileName);
    await recordAudit("home_image_removed", actor, {
      url: previous.url,
      alt: previous.alt,
      mimeType: previous.mimeType,
      size: previous.size,
    });

    return { removed: true };
  },
};
