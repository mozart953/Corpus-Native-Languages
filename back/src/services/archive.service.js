import { wordService } from "./word.service.js";
import { languageService } from "./language.service.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Admin-only aggregate view of logically removed content. Rows are never
 * copied out of their tables: they stay soft-deleted and hidden from public
 * and normal moderation queries, and the audit log keeps a full snapshot.
 */
export const archiveService = {
  async list({ page, limit, type = "all", q } = {}) {
    if (!["all", "word", "language"].includes(type)) {
      throw ApiError.badRequest("type must be one of: all, word, language.");
    }

    const wantsWords = type === "all" || type === "word";
    const wantsLanguages = type === "all" || type === "language";

    const [words, languages] = await Promise.all([
      wantsWords ? wordService.listRemoved({ page, limit, q }) : null,
      wantsLanguages ? languageService.listRemoved({ page, limit, q }) : null,
    ]);

    return {
      data: {
        words: words?.data ?? [],
        languages: languages?.data ?? [],
      },
      meta: {
        words: words?.meta ?? null,
        languages: languages?.meta ?? null,
      },
    };
  },
};
