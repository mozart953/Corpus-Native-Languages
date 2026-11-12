import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { prisma } from "../config/database.js";
import { ApiError } from "../utils/ApiError.js";
import { DEFAULT_LOCALE, normalizeLocaleCode } from "../models/locale.model.js";
import { localeRepository } from "../repositories/locale.repository.js";
import { pageContentRepository } from "../repositories/page-content.repository.js";
import { auditService } from "./audit.service.js";
import { isAdmin } from "./content-workflow.js";

/**
 * Page copy is served in two layers:
 *
 *   1. back/content/<locale>.json holds the bundled defaults.
 *   2. PageContent rows hold only the keys an admin has overridden.
 *
 * Merging them at read time means an unmodified string always falls back to the
 * file, and "reset" is just a row deletion. A locale without its own file falls
 * back to English defaults, so a future language can start with overrides only.
 */

const CONTENT_DIR = fileURLToPath(new URL("../../content/", import.meta.url));
const DEFAULTS_CACHE = new Map();

function localeResponse(locale) {
  return {
    code: locale.code,
    label: locale.label,
    isDefault: locale.isDefault,
    position: locale.position,
  };
}

async function readDefaults(localeCode) {
  if (DEFAULTS_CACHE.has(localeCode)) return DEFAULTS_CACHE.get(localeCode);

  try {
    const raw = await readFile(`${CONTENT_DIR}${localeCode}.json`, "utf8");
    const parsed = JSON.parse(raw);
    const defaults = parsed && typeof parsed === "object" ? parsed : {};
    DEFAULTS_CACHE.set(localeCode, defaults);
    return defaults;
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw new ApiError(500, `Could not read the ${localeCode} page-text defaults.`, {
        code: "CONTENT_DEFAULTS_ERROR",
      });
    }

    DEFAULTS_CACHE.set(localeCode, {});
    return {};
  }
}

async function defaultsFor(localeCode) {
  const exact = await readDefaults(localeCode);
  if (Object.keys(exact).length > 0) return exact;
  if (localeCode !== DEFAULT_LOCALE) return readDefaults(DEFAULT_LOCALE);
  return {};
}

function toOverrideMap(rows) {
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

function requireAdmin(actor) {
  if (!isAdmin(actor)) {
    throw ApiError.forbidden("Only administrators can change page text.");
  }
}

async function requireLocale(localeInput) {
  const code = normalizeLocaleCode(localeInput);
  if (!code) {
    throw ApiError.badRequest("That locale code is not valid.");
  }

  const locale = await localeRepository.findByCode(code);
  if (!locale) {
    throw ApiError.notFound("That locale does not exist.");
  }

  return locale;
}

export const pageContentService = {
  /** Public payload: merged copy plus the languages the toggle may offer. */
  async getPublic(localeInput) {
    const requested = normalizeLocaleCode(localeInput);
    const [locale, locales] = await Promise.all([
      localeRepository.resolve(requested),
      localeRepository.listActive(),
    ]);

    const code = locale?.code ?? DEFAULT_LOCALE;
    const [defaults, overrides] = await Promise.all([
      defaultsFor(code),
      pageContentRepository.findOverrides(code),
    ]);

    return {
      locale: code,
      messages: { ...defaults, ...toOverrideMap(overrides) },
      locales: locales.map(localeResponse),
    };
  },

  /** Admin payload adds the file defaults and the stored overrides. */
  async getAdmin(localeInput) {
    const locale = await requireLocale(localeInput);
    const [defaults, overrides, locales] = await Promise.all([
      defaultsFor(locale.code),
      pageContentRepository.findOverrides(locale.code),
      localeRepository.listAll(),
    ]);

    const overrideMap = toOverrideMap(overrides);

    return {
      locale: locale.code,
      messages: { ...defaults, ...overrideMap },
      defaults,
      overrides: overrideMap,
      locales: locales.map(localeResponse),
    };
  },

  /**
   * Save a batch of keys. Values equal to the bundled default delete the
   * override instead of storing a redundant row, so reset needs no special
   * client-side state.
   */
  async save(localeInput, messages, actor) {
    requireAdmin(actor);

    const locale = await requireLocale(localeInput);
    const defaults = await defaultsFor(locale.code);
    const englishDefaults = await readDefaults(DEFAULT_LOCALE);
    const knownKeys = new Set(Object.keys(englishDefaults));

    const entries = Object.entries(messages ?? {});
    if (entries.length === 0) {
      throw ApiError.badRequest("Provide at least one page-text key.");
    }

    const unknown = entries
      .map(([key]) => key)
      .filter((key) => !knownKeys.has(key));
    if (unknown.length > 0) {
      throw ApiError.badRequest("Unknown page-text keys were submitted.", {
        keys: unknown,
      });
    }

    const touched = [];

    await prisma.$transaction(async (tx) => {
      for (const [key, rawValue] of entries) {
        if (typeof rawValue !== "string") {
          throw ApiError.badRequest(`The value for "${key}" must be a string.`);
        }

        const value = rawValue.trim();
        const fallback = defaults[key] ?? englishDefaults[key] ?? "";
        const isDefault = !value || value === fallback;

        if (isDefault) {
          const result = await pageContentRepository.deleteKey(key, locale.code, tx);
          if (result.count > 0) touched.push(key);
        } else {
          await pageContentRepository.upsert(
            {
              key,
              localeCode: locale.code,
              value,
              updatedById: actor.id,
            },
            tx,
          );
          touched.push(key);
        }
      }

      await auditService.record(
        {
          entityType: "pageContent",
          entityId: locale.code,
          action: "page_text_updated",
          actor,
          snapshot: { locale: locale.code, keys: touched },
        },
        tx,
      );
    });

    return pageContentService.getAdmin(locale.code);
  },

  async resetAll(localeInput, actor) {
    requireAdmin(actor);

    const locale = await requireLocale(localeInput);

    await prisma.$transaction(async (tx) => {
      await pageContentRepository.deleteLocale(locale.code, tx);
      await auditService.record(
        {
          entityType: "pageContent",
          entityId: locale.code,
          action: "page_text_reset",
          actor,
          snapshot: { locale: locale.code },
        },
        tx,
      );
    });

    return pageContentService.getAdmin(locale.code);
  },

  async resetKey(localeInput, key, actor) {
    requireAdmin(actor);

    const locale = await requireLocale(localeInput);
    const cleanKey = String(key ?? "").trim();
    if (!cleanKey) throw ApiError.badRequest("A page-text key is required.");

    await prisma.$transaction(async (tx) => {
      await pageContentRepository.deleteKey(cleanKey, locale.code, tx);
      await auditService.record(
        {
          entityType: "pageContent",
          entityId: locale.code,
          action: "page_text_key_reset",
          actor,
          snapshot: { locale: locale.code, key: cleanKey },
        },
        tx,
      );
    });

    return pageContentService.getAdmin(locale.code);
  },
};
