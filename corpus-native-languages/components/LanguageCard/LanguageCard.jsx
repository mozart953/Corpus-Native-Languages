"use client";

import { STATUS_LABELS } from "../../data/corpus";
import "./LanguageCard.css";

/** Format a speaker count as 1.1M / 486K, which reads better on a card. */
function formatCount(value) {
  if (!value) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

/**
 * A language presented on the landing page, doubling as the selector for
 * which entries the word list shows.
 *
 * The endangerment status is intentionally prominent. This is a preservation
 * project, and a visitor should understand the stakes of what they are
 * looking at before they start browsing words.
 */
function LanguageCard({
  language,
  active = false,
  wordCount = null,
  onSelect = null,
  iconUrl = null,
  onIconUpload = null,
}) {
  const entries = wordCount ?? language.words;
  const status = STATUS_LABELS[language.status] ?? language.status;
  const isCritical = language.status === "critically-endangered";

  return (
    <article
      className={`languageCard ${active ? "is-active" : ""} ${
        isCritical ? "is-critical" : ""
      }`}
      style={{ "--card-accent": language.accent }}
    >
      <button
        type="button"
        className="languageCard__main"
        onClick={() => onSelect?.(language.id)}
        aria-pressed={active}
      >
        <span className="languageCard__icon" aria-hidden="true">
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-supplied data URL
            <img src={iconUrl} alt="" className="languageCard__iconImage" />
          ) : (
            language.autonym.charAt(0)
          )}
        </span>

        <span className="languageCard__identity">
          <span className="languageCard__name">{language.name}</span>
          <span className="languageCard__autonym">{language.autonym}</span>
        </span>

        {active ? (
          <span className="languageCard__active" aria-label="Currently selected">
            <span className="nl-icon nl-icon--check" aria-hidden="true" />
          </span>
        ) : null}
      </button>

      <p className="languageCard__region">{language.region}</p>

      <dl className="languageCard__stats">
        <div>
          <dt>Speakers</dt>
          <dd>{formatCount(language.speakers)}</dd>
        </div>
        <div>
          <dt>Words</dt>
          <dd>{formatCount(entries)}</dd>
        </div>
      </dl>

      <div className="languageCard__footer">
        <span
          className={`languageCard__status ${
            isCritical ? "is-critical" : language.status === "endangered" ? "is-warn" : ""
          }`}
        >
          {status}
        </span>

        {onIconUpload ? (
          <button
            type="button"
            className="languageCard__iconAction"
            onClick={() => onIconUpload(language.id)}
          >
            {iconUrl ? "Change icon" : "Add icon"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default LanguageCard;
