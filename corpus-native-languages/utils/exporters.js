/**
 * Export helpers: turn a list of words into JSON, TXT or CSV and hand it to the
 * browser as a file. No library, no server — just Blob + object URL.
 *
 * Every format is presentation-only. Exports never contain database ids,
 * authorship, timestamps or nested review data: the same minimal fields a
 * visitor sees on a card, with a fake positional id so rows stay distinct.
 */

/** The fields a download may expose, in display order. */
const PRESENTATION_COLUMNS = [
  "id",
  "languageName",
  "word",
  "translation",
  "pronunciation",
  "partOfSpeech",
  "usage",
];

/**
 * Project one word onto the minimal presentation shape.
 *
 * The id is positional (1..N), never the database id, and empty linguistic
 * fields are omitted so the record stays small.
 *
 * @param {object} word
 * @param {number} index
 * @returns {object}
 */
function toPublicRecord(word, index) {
  const record = {
    id: index + 1,
    languageName: word.languageName ?? "",
    word: word.word ?? "",
    translation: word.translation ?? "",
    pronunciation: word.pronunciation ?? "",
    partOfSpeech: word.partOfSpeechLabel ?? word.partOfSpeech ?? "",
    usage: word.usage ?? "",
  };

  return Object.entries(record).reduce((clean, [key, value]) => {
    if (value !== null && value !== undefined && value !== "") clean[key] = value;
    return clean;
  }, {});
}

/**
 * @param {object[]} words
 * @returns {string}
 */
export function wordsToJson(words) {
  const records = words.map(toPublicRecord);

  return JSON.stringify({ total: records.length, words: records }, null, 2);
}

/**
 * Tab-separated pairs, one per line. Optional leading `#` comment header.
 * @param {object[]} words
 * @param {{ includeHeader?: boolean, languageName?: string|null }} [options]
 * @returns {string}
 */
export function wordsToPairsTxt(
  words,
  { includeHeader = true, languageName = null } = {},
) {
  const lines = [];

  if (includeHeader) {
    lines.push(`# Native Languages — ${languageName ?? "all languages"}`);
    lines.push(`# entries: ${words.length}`);
    lines.push("# fields: word<TAB>translation<TAB>pronunciation");
  }

  words.map(toPublicRecord).forEach((record) => {
    lines.push(
      [record.word, record.translation, record.pronunciation ?? ""].join("\t"),
    );
  });

  return `${lines.join("\n")}\n`;
}

/**
 * Human-readable, one block per word — good for review and sharing.
 * @param {object[]} words
 * @param {{ includeHeader?: boolean, languageName?: string|null }} [options]
 * @returns {string}
 */
export function wordsToDetailedTxt(
  words,
  { includeHeader = true, languageName = null } = {},
) {
  const lines = [];
  const records = words.map(toPublicRecord);

  if (includeHeader) {
    lines.push(`Native Languages — ${languageName ?? "all languages"}`);
    lines.push(`Entries: ${records.length}`);
    lines.push("=".repeat(48));
    lines.push("");
  }

  records.forEach((record) => {
    lines.push(`[${record.languageName ?? "unknown"}] ${record.word}`);
    lines.push(`  translation : ${record.translation}`);
    if (record.pronunciation) lines.push(`  pronunciation: ${record.pronunciation}`);
    if (record.partOfSpeech) lines.push(`  part of speech: ${record.partOfSpeech}`);
    if (record.usage) lines.push(`  usage       : ${record.usage}`);
    lines.push("");
  });

  return lines.join("\n");
}

/** Quote one CSV cell when it contains a delimiter, quote or line break. */
function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Spreadsheet-ready CSV with the same minimal fields as the other formats.
 * The UTF-8 BOM keeps accented characters readable in Excel.
 * @param {object[]} words
 * @returns {string}
 */
export function wordsToCsv(words) {
  const records = words.map(toPublicRecord);
  const lines = [PRESENTATION_COLUMNS.join(",")];

  records.forEach((record) => {
    lines.push(
      PRESENTATION_COLUMNS.map((column) => escapeCsv(record[column])).join(","),
    );
  });

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/** Turn a label into a safe, lowercase file name fragment. */
export function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’ʼ`´]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Build `kaqchikel-2026-09-28.json`.
 * @param {string} base
 * @param {string} extension
 * @returns {string}
 */
export function buildFilename(base, extension) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${slugify(base) || "corpus"}-${stamp}.${extension}`;
}

/**
 * Trigger a browser download. Safe to call only in the browser.
 * @param {string} filename
 * @param {string} content
 * @param {string} mime
 */
export function downloadTextFile(filename, content, mime = "text/plain") {
  if (typeof document === "undefined") return;

  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Revoking immediately can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Copy text to the clipboard, falling back for non-secure contexts.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through to the legacy path */
    }
  }

  if (typeof document === "undefined") return false;

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  area.remove();
  return copied;
}
