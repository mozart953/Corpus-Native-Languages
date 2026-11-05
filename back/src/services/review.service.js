import { wordService } from "./word.service.js";
import { auditService } from "./audit.service.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Moderation queue and history. Reviewers see every pending or
 * reviewer-approved entry; admins use the same view to make the final call.
 */
export const reviewService = {
  async queue({ page, limit, type = "all", languageId } = {}) {
    if (!["all", "word", "language"].includes(type)) {
      throw ApiError.badRequest("type must be one of: all, word, language.");
    }

    const wantsWords = type === "all" || type === "word";
    const wantsLanguages = type === "all" || type === "language";

    const words = wantsWords
      ? await wordService.listForQueue({ page, limit, languageId })
      : null;
    const languages = wantsLanguages
      ? await wordService.listLanguagesForQueue({ page, limit })
      : null;

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

  history(query) {
    return auditService.list(query);
  },
};
