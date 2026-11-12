import { prisma } from "../config/database.js";
import { REVIEW_STATES } from "../models/content.model.js";
import { DEFAULT_LOCALE } from "../models/locale.model.js";
import {
  WORD_SORT_FIELDS,
  normalizePartOfSpeechCode,
} from "../models/word.model.js";
import { languageRepository } from "../repositories/language.repository.js";
import { localeRepository } from "../repositories/locale.repository.js";
import { wordRepository } from "../repositories/word.repository.js";
import { toWordResponse } from "../presenters/word.presenter.js";
import { ApiError } from "../utils/ApiError.js";
import { auditService } from "./audit.service.js";
import { contentHistory } from "./content-history.service.js";
import { createContentService } from "./content.service.js";
import { isModerator } from "./content-workflow.js";

async function assertLanguageIsUsable(languageId, client) {
  const language = await languageRepository.findById(languageId, client);
  if (!language || language.deletedAt) {
    throw ApiError.badRequest(
      "The selected language does not exist or has been removed.",
    );
  }
  return language;
}

async function ensurePartOfSpeech(value, client) {
  if (!value) return null;

  const label = String(value).trim();
  const code = normalizePartOfSpeechCode(label);
  if (!code) return null;

  await client.partOfSpeech.upsert({
    where: { code },
    create: { code, label },
    update: { label },
  });

  return code;
}

function normalizeVerified(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

function englishTranslation(sense) {
  return (
    sense?.translations?.find((row) => row.localeCode === DEFAULT_LOCALE) ?? null
  );
}

async function presentWord(id, locale) {
  const fresh = await wordRepository.findById(id);
  const decorated = await contentHistory.decorateOne("word", fresh);
  return { data: toWordResponse(decorated, { locale }) };
}

const baseWordService = createContentService({
  entityType: "word",
  entityLabel: "Word",
  repository: wordRepository,
  presenter: toWordResponse,
  sortFields: WORD_SORT_FIELDS,

  buildPublicWhere: () => ({
    language: {
      reviewStateCode: REVIEW_STATES.APPROVED,
      deletedAt: null,
    },
  }),

  buildPublicFilters: ({ languageId, partOfSpeech, verified } = {}) => {
    const where = {};

    if (languageId) where.languageId = languageId;
    if (partOfSpeech) {
      where.partOfSpeechCode = normalizePartOfSpeechCode(partOfSpeech);
    }

    // `verified` is derived from approval, so "false" can never match a public
    // row. An impossible id filter keeps the response empty without exposing
    // unpublished content.
    if (normalizeVerified(verified) === false) where.id = { in: [] };

    return where;
  },

  buildSearch: (q) => [
    { word: { contains: q } },
    { pronunciation: { contains: q } },
    {
      senses: {
        some: {
          translations: {
            some: {
              OR: [{ gloss: { contains: q } }, { usage: { contains: q } }],
            },
          },
        },
      },
    },
    { deletionReason: { contains: q } },
  ],

  queueLanguageFilter: (where, languageId) => {
    where.languageId = languageId;
  },

  removalRequestEntityFilter: async ({ languageId }) => ({
    entityId: { in: await wordRepository.findIdsByLanguage(languageId) },
  }),

  isPubliclyVisible: (word) =>
    Boolean(
      word.language &&
        !word.language.deletedAt &&
        word.language.reviewStateCode === REVIEW_STATES.APPROVED,
    ),

  prepareCreate: async (input, client) => {
    await assertLanguageIsUsable(input.languageId, client);
    return {
      partOfSpeechCode: await ensurePartOfSpeech(input.partOfSpeech, client),
    };
  },

  buildCreateData: (input, { context }) => ({
    languageId: input.languageId,
    word: input.word,
    pronunciation: input.pronunciation || null,
    partOfSpeechCode: context.partOfSpeechCode,
    senses: {
      create: [
        {
          position: 0,
          translations: {
            create: [
              {
                localeCode: DEFAULT_LOCALE,
                gloss: input.translation,
                usage: input.usage || null,
              },
            ],
          },
        },
      ],
    },
  }),

  prepareUpdate: async (input, existing, client) => {
    if (input.languageId && input.languageId !== existing.languageId) {
      await assertLanguageIsUsable(input.languageId, client);
    }

    return {
      partOfSpeechCode:
        "partOfSpeech" in input
          ? await ensurePartOfSpeech(input.partOfSpeech, client)
          : undefined,
    };
  },

  buildUpdateData: (input, existing, { context }) => {
    const data = {};

    if ("languageId" in input) data.languageId = input.languageId;
    if ("word" in input) data.word = input.word;
    if ("pronunciation" in input) {
      data.pronunciation = input.pronunciation || null;
    }
    if ("partOfSpeech" in input) {
      data.partOfSpeechCode = context.partOfSpeechCode;
    }

    // The flat API exposes the English wording of the primary sense. Update
    // that translation in place so translations for other locales survive.
    if ("translation" in input || "usage" in input) {
      const currentSense = existing.senses?.[0] ?? null;
      const currentEnglish = englishTranslation(currentSense);
      const gloss =
        "translation" in input ? input.translation : currentEnglish?.gloss;
      const nextUsage =
        "usage" in input
          ? input.usage || null
          : currentEnglish?.usage ?? null;

      if (gloss) {
        if (currentSense) {
          data.senses = {
            update: {
              where: { id: currentSense.id },
              data: {
                translations: {
                  upsert: {
                    where: {
                      senseId_localeCode: {
                        senseId: currentSense.id,
                        localeCode: DEFAULT_LOCALE,
                      },
                    },
                    create: {
                      localeCode: DEFAULT_LOCALE,
                      gloss,
                      usage: nextUsage,
                    },
                    update: { gloss, usage: nextUsage },
                  },
                },
              },
            },
          };
        } else {
          data.senses = {
            create: [
              {
                position: 0,
                translations: {
                  create: [
                    {
                      localeCode: DEFAULT_LOCALE,
                      gloss,
                      usage: nextUsage,
                    },
                  ],
                },
              },
            ],
          };
        }
      }
    }

    return data;
  },

  assertCanSubmit: (existing) => assertLanguageIsUsable(existing.languageId),
});

function requireTranslator(actor) {
  if (!isModerator(actor)) {
    throw ApiError.forbidden(
      "Only reviewers and administrators can change word translations.",
    );
  }
}

async function requireActiveLocale(localeInput) {
  const locale = await localeRepository.findByCode(localeInput);
  if (!locale) {
    throw ApiError.badRequest("That locale does not exist.");
  }
  if (!locale.isActive) {
    throw ApiError.badRequest("That locale is not active.");
  }
  return locale;
}

export const wordService = {
  ...baseWordService,

  /**
   * Create or replace one locale's wording for the word's primary sense.
   * Restricted to reviewers/admins and audited without changing the review
   * state, because a translation edit is not a moderation decision.
   */
  async saveTranslation(id, localeCode, { gloss, usage }, actor) {
    requireTranslator(actor);
    const locale = await requireActiveLocale(localeCode);

    const existing = await wordRepository.findById(id);
    if (!existing || existing.deletedAt) throw ApiError.notFound("Word not found.");

    const primarySense = existing.senses?.[0] ?? null;

    await prisma.$transaction(async (tx) => {
      if (primarySense) {
        await tx.senseTranslation.upsert({
          where: {
            senseId_localeCode: {
              senseId: primarySense.id,
              localeCode: locale.code,
            },
          },
          create: {
            senseId: primarySense.id,
            localeCode: locale.code,
            gloss,
            usage: usage || null,
          },
          update: { gloss, usage: usage || null },
        });
      } else {
        await tx.word.update({
          where: { id },
          data: {
            senses: {
              create: [
                {
                  position: 0,
                  translations: {
                    create: [
                      {
                        localeCode: locale.code,
                        gloss,
                        usage: usage || null,
                      },
                    ],
                  },
                },
              ],
            },
          },
        });
      }

      await auditService.record(
        {
          entityType: "word",
          entityId: id,
          action: "translation_updated",
          actor,
          snapshot: {
            locale: locale.code,
            gloss,
            usage: usage || null,
          },
        },
        tx,
      );
    });

    return presentWord(id, locale.code);
  },

  async deleteTranslation(id, localeCode, actor) {
    requireTranslator(actor);

    if (localeCode === DEFAULT_LOCALE) {
      throw ApiError.badRequest(
        "The default English translation cannot be deleted.",
      );
    }

    const locale = await requireActiveLocale(localeCode);
    const existing = await wordRepository.findById(id);
    if (!existing || existing.deletedAt) throw ApiError.notFound("Word not found.");

    const primarySense = existing.senses?.[0] ?? null;
    const translation = primarySense?.translations?.find(
      (row) => row.localeCode === locale.code,
    );

    if (!translation) {
      throw ApiError.notFound("That translation does not exist.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.senseTranslation.delete({ where: { id: translation.id } });
      await auditService.record(
        {
          entityType: "word",
          entityId: id,
          action: "translation_deleted",
          actor,
          snapshot: { locale: locale.code, gloss: translation.gloss },
        },
        tx,
      );
    });

    return presentWord(id, locale.code);
  },
};

