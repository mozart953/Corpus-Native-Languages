/**
 * Locale codes are BCP-47-ish (for example `en`, `es`, `es-MX`). The default
 * locale is the fallback for any key or sense that has not been translated.
 */
export const DEFAULT_LOCALE = "en";

const LOCALE_PATTERN = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

/** Normalise user input into the code shape stored in the Locale table. */
export function normalizeLocaleCode(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;

  const [language, ...rest] = text.split("-");
  const normalized = [
    language.toLowerCase(),
    ...rest.map((part) =>
      part.length === 2 ? part.toUpperCase() : part.toLowerCase(),
    ),
  ].join("-");

  return LOCALE_PATTERN.test(normalized) ? normalized : null;
}
