/**
 * Sortable columns. Translation is a to-many sense gloss, so it cannot be used
 * as a single SQL sort key; clients search it instead.
 */
export const WORD_SORT_FIELDS = Object.freeze({
  word: "word",
  languageId: "languageId",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
});

/**
 * Turn free-text part-of-speech input into a stable lookup code. The migration
 * used the same normalization for existing rows.
 */
export function normalizePartOfSpeechCode(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return null;

  const code = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return code || null;
}
