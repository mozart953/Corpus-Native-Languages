import { prisma } from "../config/database.js";
import { createContentRepository } from "./content.repository.js";

const languageSelection = {
  select: {
    id: true,
    name: true,
    autonym: true,
    reviewStateCode: true,
    deletedAt: true,
  },
};

/**
 * Data access for Word. Senses, part of speech and the parent language are
 * loaded eagerly because the presenter derives flat API fields from them.
 */
export const wordRepository = {
  ...createContentRepository({
    delegate: "word",
    defaultOrderBy: { createdAt: "desc" },
    include: {
      language: languageSelection,
      senses: { orderBy: { position: "asc" } },
      partOfSpeech: true,
      reviewState: true,
    },
  }),

  /** Used to narrow pending removal requests to one language. */
  async findIdsByLanguage(languageId, client = prisma) {
    const rows = await client.word.findMany({
      where: { languageId },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },
};
