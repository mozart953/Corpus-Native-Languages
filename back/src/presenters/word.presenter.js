import { REVIEW_STATES } from "../models/content.model.js";
import { DEFAULT_LOCALE } from "../models/locale.model.js";

/**
 * Pick the wording for one sense in the requested locale. English is the
 * canonical fallback, and the first available translation is the last resort
 * for data that predates the translation table.
 */
function translationFor(sense, locale) {
  const translations = sense?.translations ?? [];
  const exact = translations.find((row) => row.localeCode === locale);
  const fallback =
    translations.find((row) => row.localeCode === DEFAULT_LOCALE) ??
    translations[0] ??
    null;

  return {
    chosen: exact ?? fallback,
    translations,
  };
}

/**
 * Public representation of a word. `languageName` is derived from the joined
 * language, and the flat translation/usage fields stay compatible with the
 * existing frontend. Pass `locale` to read a translated sense; when that locale
 * is missing the English wording is returned and `translationIsFallback` says
 * so. `senses` is additive and exposes every locale.
 */
export function toWordResponse(word, { locale = DEFAULT_LOCALE } = {}) {
  const senses = word.senses ?? [];
  const primarySense = senses[0] ?? null;
  const primary = translationFor(primarySense, locale);
  const latestDecision = word.latestDecision ?? null;
  const removalRequest = word.latestRemovalRequest ?? null;

  return {
    id: word.id,
    languageId: word.languageId,
    languageName: word.language?.name ?? null,
    word: word.word,
    translation: primary.chosen?.gloss ?? "",
    pronunciation: word.pronunciation ?? "",
    partOfSpeech: word.partOfSpeechCode ?? "",
    usage: primary.chosen?.usage ?? "",
    translationLocale: primary.chosen?.localeCode ?? null,
    translationIsFallback: Boolean(
      primary.chosen && primary.chosen.localeCode !== locale,
    ),
    verified: word.reviewStateCode === REVIEW_STATES.APPROVED,
    reviewState: word.reviewStateCode,
    rejectionReason:
      latestDecision?.stateCode === REVIEW_STATES.REJECTED
        ? latestDecision.comment ?? null
        : null,
    reviewedAt: latestDecision?.reviewerId ? latestDecision.createdAt : null,
    removalRequestedAt: removalRequest?.createdAt ?? null,
    removalRequestReason: removalRequest?.reason ?? null,
    createdById: word.createdById ?? null,
    deletedAt: word.deletedAt ?? null,
    deletionReason: word.deletionReason ?? null,
    createdAt: word.createdAt,
    updatedAt: word.updatedAt,

    // Normalized detail, safe for existing clients to ignore.
    senses: senses.map((sense) => {
      const { chosen, translations } = translationFor(sense, locale);
      return {
        id: sense.id,
        gloss: chosen?.gloss ?? "",
        usage: chosen?.usage ?? "",
        position: sense.position,
        locale: chosen?.localeCode ?? null,
        translations: translations.map((row) => ({
          locale: row.localeCode,
          gloss: row.gloss,
          usage: row.usage ?? "",
        })),
      };
    }),
    partOfSpeechLabel: word.partOfSpeech?.label ?? null,
    reviewStateLabel: word.reviewState?.label ?? null,
  };
}
