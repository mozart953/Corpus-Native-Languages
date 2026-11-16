import { DEFAULT_LOCALE } from "../models/locale.model.js";

/**
 * Resolve one part-of-speech row for a locale. English is the canonical
 * fallback, and the legacy `label` column is the last resort for rows created
 * before translations were introduced.
 */
export function toPartOfSpeechResponse(
  row,
  { locale = DEFAULT_LOCALE } = {},
) {
  const translations = row.translations ?? [];
  const exact = translations.find((item) => item.localeCode === locale);
  const english = translations.find(
    (item) => item.localeCode === DEFAULT_LOCALE,
  );
  const chosen = exact ?? english ?? null;

  return {
    code: row.code,
    label: chosen?.label ?? row.label,
    labelEn: english?.label ?? row.label,
    locale: chosen?.localeCode ?? DEFAULT_LOCALE,
    isFallback: Boolean(chosen && chosen.localeCode !== locale),
    isActive: row.isActive,
    wordCount: row._count?.words ?? 0,
    translations: translations.map((item) => ({
      locale: item.localeCode,
      label: item.label,
    })),
  };
}
