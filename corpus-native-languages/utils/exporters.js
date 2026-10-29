/**
 * Export helpers: turn a list of words into JSON or TXT and hand it to the
 * browser as a file. No library, no server — just Blob + object URL.
 *
 * The TXT writer is the one that matters most for this project: a flat
 * `word<TAB>translation` file is the shape a training pipeline can consume
 * directly, while the JSON export keeps every field for later auditing.
 */

/** Fields dropped from exports because they are UI-only. */
const UI_ONLY_FIELDS = new Set(["selected"]);

/**
 * Strip UI-only state and drop empty values.
 * @param {object} word
 * @returns {object}
 */
function toRecord(word) {
  return Object.entries(word).reduce((record, [key, value]) => {
    if (UI_ONLY_FIELDS.has(key)) return record;
    if (value === null || value === undefined || value === "") return record;
    record[key] = value;
    return record;
  }, {});
}

/**
 * @param {object[]} words
 * @param {object} [meta] free-form provenance for the export header
 * @returns {string}
 */
export function wordsToJson(words, meta = {}) {
  const payload = {
    meta: {
      project: "Native Languages",
      exportedAt: new Date().toISOString(),
      ...meta,
    },
    total: words.length,
    words: words.map(toRecord),
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Tab-separated pairs, one per line. Optional leading `#` comment header.
 * @param {object[]} words
 * @param {{ includeHeader?: boolean, meta?: object }} [options]
 * @returns {string}
 */
export function wordsToPairsTxt(words, { includeHeader = true, meta = {} } = {}) {
  const lines = [];

  if (includeHeader) {
    lines.push(`# Native Languages — ${meta.languageName ?? "all languages"}`);
    lines.push(`# exported: ${new Date().toISOString()}`);
    lines.push(`# entries: ${words.length}`);
    lines.push("# fields: word<TAB>translation<TAB>pronunciation");
  }

  words.forEach((word) => {
    lines.push([word.word, word.translation, word.pronunciation ?? ""].join("\t"));
  });

  return `${lines.join("\n")}\n`;
}

/**
 * Human-readable, one block per word — good for review and sharing.
 * @param {object[]} words
 * @param {{ includeHeader?: boolean, meta?: object }} [options]
 * @returns {string}
 */
export function wordsToDetailedTxt(words, { includeHeader = true, meta = {} } = {}) {
  const lines = [];

  if (includeHeader) {
    lines.push(`Native Languages — ${meta.languageName ?? "all languages"}`);
    lines.push(`Exported: ${new Date().toISOString()}`);
    lines.push(`Entries: ${words.length}`);
    lines.push("=".repeat(48));
    lines.push("");
  }

  words.forEach((word) => {
    lines.push(`[${word.languageName ?? word.languageId}] ${word.word}`);
    lines.push(`  translation : ${word.translation}`);
    if (word.pronunciation) lines.push(`  pronunciation: ${word.pronunciation}`);
    if (word.partOfSpeech) lines.push(`  part of speech: ${word.partOfSpeech}`);
    if (word.usage) lines.push(`  usage       : ${word.usage}`);
    if (word.verified === false) lines.push("  status      : pending community verification");
    lines.push("");
  });

  return lines.join("\n");
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
