/** Shared locale constants used by both the server layout and the client provider. */

export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "nl-locale";
export const LOCALE_STORAGE = "nl-locale";

const LOCALE_PATTERN = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

export function isLocaleCode(value) {
  return LOCALE_PATTERN.test(String(value ?? ""));
}

/** Expand `{name}` placeholders without touching other braces in the copy. */
export function interpolate(template, vars) {
  if (!vars) return template;

  return String(template).replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match,
  );
}
