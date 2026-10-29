/**
 * Corpus search: filters words and groups them by language.
 * Kept framework-free so it can be reused from a server component later.
 */

import { normalizeQuery } from "./text";

/** Which fields a query is allowed to match against. */
export const SEARCH_FIELDS = {
  ALL: "all",
  WORD: "word",
  TRANSLATION: "translation",
};

/** The fields a word exposes, in the order they are shown on a card. */
export function getSearchableFields(word) {
  return [word.word, word.translation, word.pronunciation, word.usage].filter(
    (value) => typeof value === "string" && value.length > 0,
  );
}

/**
 * Filter words by free text.
 * @param {object[]} words
 * @param {string} query
 * @param {string} [field] one of SEARCH_FIELDS
 * @returns {object[]}
 */
export function searchWords(words, query, field = SEARCH_FIELDS.ALL) {
  const needle = normalizeQuery(query);
  if (!needle) return words;

  return words.filter((word) => {
    let haystack;

    if (field === SEARCH_FIELDS.WORD) {
      haystack = [word.word];
    } else if (field === SEARCH_FIELDS.TRANSLATION) {
      haystack = [word.translation];
    } else {
      haystack = getSearchableFields(word);
    }

    return haystack.some((value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['’ʼ`´.\-\u2019]/g, "").includes(needle));
  });
}

/**
 * Filter to one language. Pass "all" to keep every language.
 * @param {object[]} words
 * @param {string} languageId
 * @returns {object[]}
 */
export function filterByLanguage(words, languageId) {
  if (!languageId || languageId === "all") return words;
  return words.filter((word) => word.languageId === languageId);
}

/**
 * Combine language filter + free text search.
 * @param {object[]} words
 * @param {{ query?: string, languageId?: string, field?: string }} options
 * @returns {object[]}
 */
export function filterWords(words, { query = "", languageId = "all", field = SEARCH_FIELDS.ALL } = {}) {
  return searchWords(filterByLanguage(words, languageId), query, field);
}
