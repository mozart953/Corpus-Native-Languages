import { REVIEW_STATES } from "../models/content.model.js";
import {
  WORD_SORT_FIELDS,
  normalizePartOfSpeechCode,
} from "../models/word.model.js";
import { languageRepository } from "../repositories/language.repository.js";
import { wordRepository } from "../repositories/word.repository.js";
import { toWordResponse } from "../presenters/word.presenter.js";
import { ApiError } from "../utils/ApiError.js";
import { createContentService } from "./content.service.js";

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

export const wordService = createContentService({
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
    { senses: { some: { OR: [{ gloss: { contains: q } }, { usage: { contains: q } }] } } },
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
          gloss: input.translation,
          usage: input.usage || null,
          position: 0,
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

    // The public API exposes one primary sense. When translation or usage
    // changes, replace that sense atomically instead of duplicating columns.
    if ("translation" in input || "usage" in input) {
      const current = existing.senses?.[0] ?? {};
      data.senses = {
        deleteMany: {},
        create: [
          {
            gloss: "translation" in input ? input.translation : current.gloss,
            usage:
              "usage" in input
                ? input.usage || null
                : current.usage ?? null,
            position: 0,
          },
        ],
      };
    }

    return data;
  },

  assertCanSubmit: (existing) => assertLanguageIsUsable(existing.languageId),
});
