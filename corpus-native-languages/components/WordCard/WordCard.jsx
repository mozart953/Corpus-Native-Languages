"use client";

import { useState } from "react";
import { splitHighlight } from "../../utils/text";
import { copyToClipboard } from "../../utils/exporters";
import "./WordCard.css";

/** Render a string with query matches wrapped in <mark>. */
function Highlighted({ text, query }) {
  const segments = splitHighlight(text, query);

  return segments.map((segment, index) =>
    segment.match ? (
      <mark key={index} className="wordCard__mark">
        {segment.text}
      </mark>
    ) : (
      <span key={index}>{segment.text}</span>
    ),
  );
}

/**
 * One entry: the word in its own language, and the translation right beside it.
 *
 * The native word and the translation sit on the same baseline grid rather
 * than being stacked, so a reader can scan down a column of the list and still
 * see the pairing at a glance. Copy support is here because contributors
 * constantly paste pairs into other tools.
 */
function WordCard({
  word,
  query = "",
  selected = false,
  onToggleSelect = null,
  showLanguage = true,
  onDownloadSingle = null,
}) {
  const [copied, setCopied] = useState(false);

  const copyPair = async () => {
    const ok = await copyToClipboard(`${word.word}\t${word.translation}`);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const copyLabel = copied ? "Copied" : "Copy pair";

  return (
    <article
      className={`wordCard ${selected ? "is-selected" : ""}`}
      aria-label={`${word.word} — ${word.translation}`}
    >
      <header className="wordCard__head">
        {onToggleSelect ? (
          <label className="wordCard__select">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(word.id)}
              aria-label={`Select ${word.word} for export`}
            />
            <span className="wordCard__checkbox" aria-hidden="true">
              <span className="nl-icon nl-icon--check" />
            </span>
          </label>
        ) : null}

        {showLanguage ? <span className="nl-chip wordCard__lang">{word.languageName}</span> : null}

        {word.verified === false ? (
          <span className="nl-chip nl-chip--muted wordCard__pending">Pending review</span>
        ) : (
          <span className="nl-chip wordCard__verified">Verified</span>
        )}
      </header>

      <div className="wordCard__pair">
        <p className="wordCard__word" lang={word.languageId}>
          <Highlighted text={word.word} query={query} />
        </p>

        <span className="wordCard__arrow" aria-hidden="true">
          →
        </span>

        <p className="wordCard__translation">
          <Highlighted text={word.translation} query={query} />
        </p>
      </div>

      {word.pronunciation ? (
        <p className="wordCard__pronunciation">
          <span className="wordCard__label">Pronunciation</span>
          <span className="wordCard__value">{word.pronunciation}</span>
        </p>
      ) : null}

      {word.partOfSpeech ? <span className="nl-chip nl-chip--muted">{word.partOfSpeech}</span> : null}

      {word.usage ? (
        <p className="wordCard__usage">
          <span className="wordCard__label">Usage</span>
          {word.usage}
        </p>
      ) : null}

      <footer className="wordCard__foot">
        <button
          type="button"
          className={`nl-btn nl-btn--sm nl-btn--ghost wordCard__action ${copied ? "is-copied" : ""}`}
          onClick={copyPair}
          aria-live="polite"
        >
          <span
            className={`nl-icon ${copied ? "nl-icon--check" : "nl-icon--copy"}`}
            aria-hidden="true"
          />
          {copyLabel}
        </button>

        {onDownloadSingle ? (
          <button
            type="button"
            className="nl-btn nl-btn--sm nl-btn--ghost wordCard__action"
            onClick={() => onDownloadSingle(word)}
          >
            <span className="nl-icon nl-icon--download" aria-hidden="true" />
            Download
          </button>
        ) : null}
      </footer>
    </article>
  );
}

export default WordCard;
