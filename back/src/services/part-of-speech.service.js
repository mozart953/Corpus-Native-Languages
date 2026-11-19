import { prisma } from "../config/database.js";
import {
  DEFAULT_LOCALE,
  normalizeLocaleCode,
} from "../models/locale.model.js";
import { normalizePartOfSpeechCode } from "../models/word.model.js";
import { localeRepository } from "../repositories/locale.repository.js";
import { partOfSpeechRepository } from "../repositories/part-of-speech.repository.js";
import { toPartOfSpeechResponse } from "../presenters/part-of-speech.presenter.js";
import { ApiError } from "../utils/ApiError.js";
import { auditService } from "./audit.service.js";

const MAX_LABEL_LENGTH = 80;

function requireAdmin(actor) {
  if (actor?.role !== "admin") {
    throw ApiError.forbidden("Only administrators can manage parts of speech.");
  }
}

function cleanTranslations(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw ApiError.badRequest("Provide translation labels by locale.");
  }

  const entries = Object.entries(input);
  if (entries.length === 0) {
    throw ApiError.badRequest("Provide at least one translation label.");
  }

  const cleaned = {};
  for (const [rawCode, rawLabel] of entries) {
    const code = normalizeLocaleCode(rawCode);
    if (!code) {
      throw ApiError.badRequest(`"${rawCode}" is not a valid locale code.`);
    }
    if (typeof rawLabel !== "string") {
      throw ApiError.badRequest(`The label for "${code}" must be text.`);
    }

    const label = rawLabel.trim();
    if (!label) {
      throw ApiError.badRequest(`The label for "${code}" cannot be empty.`);
    }
    if (label.length > MAX_LABEL_LENGTH) {
      throw ApiError.badRequest(
        `The label for "${code}" must be at most ${MAX_LABEL_LENGTH} characters.`,
      );
    }

    cleaned[code] = label;
  }

  return cleaned;
}

async function ensureActiveLocales(codes, client) {
  for (const code of codes) {
    const locale = await localeRepository.findByCode(code, client);
    if (!locale) {
      throw ApiError.badRequest(`The locale "${code}" does not exist.`);
    }
    if (!locale.isActive) {
      throw ApiError.badRequest(`The locale "${code}" is not active.`);
    }
  }
}

function sortRows(rows, locale) {
  return rows
    .map((row) => toPartOfSpeechResponse(row, { locale }))
    .sort((left, right) => left.label.localeCompare(right.label, locale));
}

async function writeRow({ code, translations, isActive, action, actor }) {
  return prisma.$transaction(async (tx) => {
    if (translations) {
      for (const [localeCode, label] of Object.entries(translations)) {
        await partOfSpeechRepository.upsertTranslation(
          { partOfSpeechCode: code, localeCode, label },
          tx,
        );
      }

      if (translations[DEFAULT_LOCALE]) {
        await partOfSpeechRepository.update(
          code,
          { label: translations[DEFAULT_LOCALE] },
          tx,
        );
      }
    }

    if (isActive !== undefined) {
      await partOfSpeechRepository.update(code, { isActive }, tx);
    }

    await auditService.record(
      {
        entityType: "partOfSpeech",
        entityId: code,
        action,
        actor,
        snapshot: {
          code,
          translations: translations ?? undefined,
          isActive,
        },
      },
      tx,
    );

    return partOfSpeechRepository.findByCode(code, tx);
  });
}

async function requireRow(code) {
  const row = await partOfSpeechRepository.findByCode(code);
  if (!row) throw ApiError.notFound("Part of speech not found.");
  return row;
}

/**
 * Parts of speech are admin-managed reference data. Contributors only read the
 * active list and submit a stable code with a word. English is the canonical
 * fallback label; every locale's wording is stored in
 * PartOfSpeechTranslation.
 */
export const partOfSpeechService = {
  async listPublic(localeInput) {
    const locale = await localeRepository.resolve(localeInput);
    const rows = await partOfSpeechRepository.findMany({
      includeInactive: false,
    });
    return { data: sortRows(rows, locale.code) };
  },

  async listAdmin(localeInput) {
    const locale = await localeRepository.resolve(localeInput);
    const rows = await partOfSpeechRepository.findMany({
      includeInactive: true,
    });
    return { data: sortRows(rows, locale.code) };
  },

  async create({ code, translations }, actor) {
    requireAdmin(actor);

    const clean = cleanTranslations(translations);
    const english = clean[DEFAULT_LOCALE];
    if (!english) {
      throw ApiError.badRequest("An English label is required.");
    }

    const normalized = normalizePartOfSpeechCode(code || english);
    if (!normalized) {
      throw ApiError.badRequest("Provide a valid code or English label.");
    }

    const existing = await partOfSpeechRepository.findByCode(normalized);
    if (existing) {
      throw ApiError.conflict(
        "A part of speech with that code already exists.",
      );
    }

    await ensureActiveLocales(Object.keys(clean));

    const row = await prisma.$transaction(async (tx) => {
      await partOfSpeechRepository.create(
        { code: normalized, label: english },
        tx,
      );

      for (const [localeCode, label] of Object.entries(clean)) {
        await partOfSpeechRepository.upsertTranslation(
          { partOfSpeechCode: normalized, localeCode, label },
          tx,
        );
      }

      await auditService.record(
        {
          entityType: "partOfSpeech",
          entityId: normalized,
          action: "part_of_speech_created",
          actor,
          snapshot: { code: normalized, translations: clean },
        },
        tx,
      );

      return partOfSpeechRepository.findByCode(normalized, tx);
    });

    return { data: toPartOfSpeechResponse(row) };
  },

  async update(codeInput, { translations, isActive }, actor) {
    requireAdmin(actor);

    const code = normalizePartOfSpeechCode(codeInput);
    if (!code) {
      throw ApiError.badRequest("A valid part-of-speech code is required.");
    }

    await requireRow(code);

    const clean =
      translations === undefined ? null : cleanTranslations(translations);
    if (!clean && isActive === undefined) {
      throw ApiError.badRequest(
        "Provide a label or an active state to update.",
      );
    }

    if (clean) await ensureActiveLocales(Object.keys(clean));

    const row = await writeRow({
      code,
      translations: clean,
      isActive: isActive === undefined ? undefined : Boolean(isActive),
      action: "part_of_speech_updated",
      actor,
    });

    return { data: toPartOfSpeechResponse(row) };
  },

  async deactivate(codeInput, actor) {
    requireAdmin(actor);

    const code = normalizePartOfSpeechCode(codeInput);
    const existing = await requireRow(code);

    const row = await writeRow({
      code,
      isActive: false,
      action: "part_of_speech_deactivated",
      actor,
    });

    return {
      data: {
        ...toPartOfSpeechResponse(row),
        previousState: existing.isActive,
      },
    };
  },

  async activate(codeInput, actor) {
    requireAdmin(actor);

    const code = normalizePartOfSpeechCode(codeInput);
    await requireRow(code);

    const row = await writeRow({
      code,
      isActive: true,
      action: "part_of_speech_activated",
      actor,
    });

    return { data: toPartOfSpeechResponse(row) };
  },
};
