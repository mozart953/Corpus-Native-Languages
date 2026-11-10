import { REVIEW_STATES } from "../models/content.model.js";
import { createContentRepository } from "./content.repository.js";

/**
 * Data access for Language. Regions are a many-to-many relation; `_count`
 * exposes only approved, non-deleted words so the presenter can derive the
 * public `words` field from real data.
 */
export const languageRepository = createContentRepository({
  delegate: "language",
  defaultOrderBy: { name: "asc" },
  include: {
    regions: {
      orderBy: { position: "asc" },
      include: { region: true },
    },
    status: true,
    reviewState: true,
    _count: {
      select: {
        entries: {
          where: {
            reviewStateCode: REVIEW_STATES.APPROVED,
            deletedAt: null,
          },
        },
      },
    },
  },
});
