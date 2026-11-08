"use client";

import { useState } from "react";
import { Check, Copy, Download, MoveRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

        {showLanguage ? (
          <Badge variant="outline" className="wordCard__lang border-white/10 bg-white/[0.04] text-white/80">
            {word.languageName}
          </Badge>
        ) : null}

        {word.verified === false ? (
          <Badge variant="outline" className="wordCard__pending border-dashed border-white/10 text-white/55">
            Pending review
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-[rgba(88,224,164,0.4)] bg-[var(--nl-success-soft)] text-[var(--nl-success)]"
          >
            Verified
          </Badge>
        )}
      </header>

      <div className="wordCard__pair">
        <p className="wordCard__word" lang={word.languageId}>
          <Highlighted text={word.word} query={query} />
        </p>

        <span className="wordCard__arrow" aria-hidden="true">
          <MoveRight className="size-4" />
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

      {word.partOfSpeech ? (
        <Badge variant="outline" className="w-fit border-white/10 bg-white/[0.03] text-white/55">
          {word.partOfSpeech}
        </Badge>
      ) : null}

      {word.usage ? (
        <p className="wordCard__usage">
          <span className="wordCard__label">Usage</span>
          {word.usage}
        </p>
      ) : null}

      <footer className="wordCard__foot">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`wordCard__action ${copied ? "is-copied" : ""}`}
          onClick={copyPair}
          aria-live="polite"
        >
          {copied ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <Copy className="size-3.5" aria-hidden="true" />
          )}
          {copyLabel}
        </Button>

        {onDownloadSingle ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="wordCard__action"
            onClick={() => onDownloadSingle(word)}
          >
            <Download className="size-3.5" aria-hidden="true" />
            Download
          </Button>
        ) : null}
      </footer>
    </article>
  );
}

export default WordCard;
