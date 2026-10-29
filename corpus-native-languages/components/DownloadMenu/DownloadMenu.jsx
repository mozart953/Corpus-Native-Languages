"use client";

import { useState } from "react";
import {
  buildFilename,
  copyToClipboard,
  downloadTextFile,
  wordsToDetailedTxt,
  wordsToJson,
  wordsToPairsTxt,
} from "../../utils/exporters";
import "./DownloadMenu.css";

/** The export formats offered. */
export const FORMATS = {
  JSON: "json",
  PAIRS: "pairs",
  DETAILED: "detailed",
};

const FORMAT_META = {
  [FORMATS.JSON]: { label: "JSON", hint: "Full records, nested under a meta header" },
  [FORMATS.PAIRS]: { label: "TXT", hint: "One word per line, tab separated" },
  [FORMATS.DETAILED]: { label: "TXT", hint: "Readable blocks with usage notes" },
};

/**
 * Export the visible words to a file.
 *
 * The scope matters: once a language and a search are active, "all words"
 * would be a lie, so the menu only offers selections that match what the
 * visitor is actually looking at. The TXT pair format is deliberately
 * tab-separated — that is the shape a training pipeline can read directly.
 */
function DownloadMenu({
  words = [],
  languageName = "all languages",
  selectedIds = [],
  baseName = "corpus",
  onExport = null,
}) {
  const [format, setFormat] = useState(FORMATS.JSON);
  const [message, setMessage] = useState(null);

  const selectedWords = words.filter((word) => selectedIds.includes(word.id));
  const useSelection = selectedWords.length > 0;
  const target = useSelection ? selectedWords : words;

  const isEmpty = target.length === 0;
  const meta = { languageName: useSelection ? `${languageName} (selection)` : languageName };

  const serialise = (chosen) => {
    if (chosen === FORMATS.JSON) {
      return { content: wordsToJson(target, meta), extension: "json", mime: "application/json" };
    }
    if (chosen === FORMATS.PAIRS) {
      return { content: wordsToPairsTxt(target, { meta }), extension: "txt", mime: "text/plain" };
    }
    return { content: wordsToDetailedTxt(target, { meta }), extension: "txt", mime: "text/plain" };
  };

  const flash = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2600);
  };

  const handleDownload = () => {
    if (isEmpty) return;

    const { content, extension, mime } = serialise(format);
    const filename = buildFilename(`${baseName}-${useSelection ? "selection" : ""}`, extension);

    downloadTextFile(filename, content, mime);
    onExport?.({ format, filename, count: target.length });
    flash(`Downloading ${filename} · ${target.length} words`);
  };

  const handleCopy = async () => {
    if (isEmpty) return;

    const { content, extension } = serialise(format);
    const ok = await copyToClipboard(content);

    flash(ok ? `Copied ${target.length} words as ${extension.toUpperCase()}` : "Could not copy");
  };

  return (
    <div className="downloadMenu">
      <div className="downloadMenu__head">
        <div>
          <span className="nl-eyebrow">Export</span>
          <h3 className="downloadMenu__title">Download these words</h3>
        </div>

        {useSelection ? (
          <span className="nl-chip downloadMenu__scope">
            {selectedWords.length} selected
          </span>
        ) : (
          <span className="nl-chip nl-chip--muted downloadMenu__scope">
            {words.length} in view
          </span>
        )}
      </div>

      <div className="downloadMenu__formats" role="group" aria-label="Export format">
        {Object.values(FORMATS).map((id) => (
          <button
            key={id}
            type="button"
            className={`downloadMenu__format ${format === id ? "is-active" : ""}`}
            onClick={() => setFormat(id)}
            aria-pressed={format === id}
          >
            <span className="downloadMenu__formatName">{FORMAT_META[id].label}</span>
            <span className="downloadMenu__formatHint">{FORMAT_META[id].hint}</span>
          </button>
        ))}
      </div>

      <div className="downloadMenu__actions">
        <button
          type="button"
          className="nl-btn nl-btn--primary downloadMenu__download"
          onClick={handleDownload}
          disabled={isEmpty}
        >
          <span className="nl-icon nl-icon--download" aria-hidden="true" />
          Download {FORMAT_META[format].label}
        </button>

        <button
          type="button"
          className="nl-btn"
          onClick={handleCopy}
          disabled={isEmpty}
        >
          <span className="nl-icon nl-icon--copy" aria-hidden="true" />
          Copy
        </button>
      </div>

      <p className="downloadMenu__note">
        {isEmpty
          ? "Nothing to export in this selection."
          : `Exports the ${target.length} ${target.length === 1 ? "word" : "words"} currently shown${
              useSelection ? " that you ticked" : ""
            }.`}
      </p>

      <p className="downloadMenu__message" role="status" aria-live="polite">
        {message ?? ""}
      </p>
    </div>
  );
}

export default DownloadMenu;
