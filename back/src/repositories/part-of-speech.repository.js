import { prisma } from "../config/database.js";

const listInclude = {
  translations: { orderBy: { localeCode: "asc" } },
  _count: { select: { words: true } },
};

/**
 * Part-of-speech lookup access. Administrators own the list; every visitor may
 * read the active rows, and word rows only reference the stable code.
 */
export const partOfSpeechRepository = {
  findMany({ includeInactive = false } = {}, client = prisma) {
    return client.partOfSpeech.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: listInclude,
      orderBy: { label: "asc" },
    });
  },

  findByCode(code, client = prisma) {
    return client.partOfSpeech.findUnique({
      where: { code },
      include: listInclude,
    });
  },

  create({ code, label, isActive = true }, client = prisma) {
    return client.partOfSpeech.create({
      data: { code, label, isActive },
      include: listInclude,
    });
  },

  update(code, data, client = prisma) {
    return client.partOfSpeech.update({
      where: { code },
      data,
      include: listInclude,
    });
  },

  countWords(code, client = prisma) {
    return client.word.count({ where: { partOfSpeechCode: code } });
  },

  upsertTranslation({ partOfSpeechCode, localeCode, label }, client = prisma) {
    return client.partOfSpeechTranslation.upsert({
      where: {
        partOfSpeechCode_localeCode: { partOfSpeechCode, localeCode },
      },
      create: { partOfSpeechCode, localeCode, label },
      update: { label },
    });
  },
};
