import { wordService } from "./word.service.js";
import { languageService } from "./language.service.js";
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

    const [words, languages, removalWords, removalLanguages] = await Promise.all([
      wantsWords ? wordService.listForQueue({ page, limit, languageId }) : null,
      wantsLanguages ? languageService.listForQueue({ page, limit }) : null,
      wantsWords
        ? wordService.listRemovalRequests({ page, limit, languageId })
        : null,
      wantsLanguages ? languageService.listRemovalRequests({ page, limit }) : null,
    ]);

    return {
      data: {
        words: words?.data ?? [],
        languages: languages?.data ?? [],
        removalRequests: {
          words: removalWords?.data ?? [],
          languages: removalLanguages?.data ?? [],
        },
      },
      meta: {
        words: words?.meta ?? null,
        languages: languages?.meta ?? null,
        removalRequests: {
          words: removalWords?.meta ?? null,
          languages: removalLanguages?.meta ?? null,
        },
      },
    };
  },

  history(query) {
    return auditService.list(query);
  },
};
