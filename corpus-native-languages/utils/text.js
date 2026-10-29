/**
 * Text utilities for the corpus search.
 *
 * Search has to be forgiving because Mayan orthography varies between
 * communities: `K'iche`, `K'iche'`, `k´iche` and `Kʼicheʼ` are the same
 * language name. We therefore fold text before comparing: strip diacritics,
 * drop apostrophes/hyphens, and lowercase. Highlighting still needs to point
 * back at the original characters, so every helper returns an index map.
 */

/** Characters treated as decorative: they never take part in matching. */
const PUNCTUATION = /['’ʼ`´.\-\u2019]/g;

const COMBINING_MARKS = /[\u0300-\u036f]/g;

/**
 * Lowercase + strip diacritics + drop decorative punctuation.
 * @param {unknown} value
 * @returns {string}
 */
export function foldText(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(PUNCTUATION, "");
}

/**
 * Fold `value` and remember where every folded character came from.
 * @param {string} value
 * @returns {{ folded: string, map: number[] }} `map[i]` is the index in
 *   `Array.from(value)` that produced `folded[i]`.
 */
export function foldWithMap(value) {
  const chars = Array.from(String(value ?? ""));
  const map = [];
  let folded = "";

  chars.forEach((char, index) => {
    const next = foldText(char);
    for (let i = 0; i < next.length; i += 1) {
      map.push(index);
      folded += next[i];
    }
  });

  return { folded, map };
}

/**
 * Split `value` into plain and highlighted runs, so a card can wrap matches
 * in a <mark> without using dangerouslySetInnerHTML.
 * @param {string} value
 * @param {string} query
 * @returns {Array<{ text: string, match: boolean }>}
 */
export function splitHighlight(value, query) {
  const chars = Array.from(String(value ?? ""));
  const needle = foldText(query).trim();

  if (!chars.length) return [];
  if (!needle) return [{ text: chars.join(""), match: false }];

  const { folded, map } = foldWithMap(chars.join(""));
  const segments = [];
  let cursor = 0;
  let hit = folded.indexOf(needle);

  while (hit !== -1) {
    const startIndex = map[hit];
    const endIndex = map[hit + needle.length - 1] + 1;

    if (startIndex > cursor) {
      segments.push({ text: chars.slice(cursor, startIndex).join(""), match: false });
    }
    segments.push({ text: chars.slice(startIndex, endIndex).join(""), match: true });
    cursor = endIndex;
    hit = folded.indexOf(needle, hit + needle.length);
  }

  if (cursor < chars.length) {
    segments.push({ text: chars.slice(cursor).join(""), match: false });
  }

  return segments;
}

/** Collapse a query to a comparable string. */
export function normalizeQuery(query) {
  return foldText(query).trim();
}
