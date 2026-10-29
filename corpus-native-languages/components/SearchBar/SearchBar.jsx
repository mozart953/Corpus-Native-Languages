"use client";

import { useEffect, useRef } from "react";
import { SEARCH_FIELDS } from "../../utils/search";
import "./SearchBar.css";

/** Scope options, in the order they appear in the toggle group. */
const SCOPES = [
  { id: SEARCH_FIELDS.ALL, label: "All", hint: "Search words and translations" },
  { id: SEARCH_FIELDS.WORD, label: "Words", hint: "Only the original language" },
  { id: SEARCH_FIELDS.TRANSLATION, label: "Translations", hint: "Only the translation" },
];

/**
 * Corpus search field.
 *
 * Matching a word and its translation in one box is the point of this bar, so
 * the scope group only narrows that default. `/` focuses the input from
 * anywhere, Escape clears it, and the result count is announced politely.
 */
function SearchBar({
  value = "",
  onChange = null,
  scope = SEARCH_FIELDS.ALL,
  onScopeChange = null,
  resultCount = null,
  totalCount = null,
  placeholder = "Search a word or its translation — try “jun” or “water”",
  autoFocus = false,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;

      const tag = document.activeElement?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (isTyping) return;

      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleChange = (event) => onChange?.(event.target.value);

  const handleKeyDown = (event) => {
    if (event.key === "Escape" && value) {
      event.preventDefault();
      onChange?.("");
    }
  };

  const isFiltered = resultCount !== null && totalCount !== null && resultCount !== totalCount;

  return (
    <div className="searchBar">
      <div className="searchBar__field">
        <span className="nl-icon nl-icon--search searchBar__icon" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          className="searchBar__input"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search the corpus by word or translation"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          autoFocus={autoFocus}
        />

        {value ? (
          <button
            type="button"
            className="searchBar__clear"
            onClick={() => {
              onChange?.("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <span className="nl-icon nl-icon--close" aria-hidden="true" />
          </button>
        ) : (
          <kbd className="searchBar__kbd" aria-hidden="true">
            /
          </kbd>
        )}
      </div>

      <div className="searchBar__controls">
        <div
          className="searchBar__scopes"
          role="group"
          aria-label="Choose which fields to search"
        >
          {SCOPES.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`searchBar__scope ${scope === option.id ? "is-active" : ""}`}
              onClick={() => onScopeChange?.(option.id)}
              aria-pressed={scope === option.id}
              title={option.hint}
            >
              {option.label}
            </button>
          ))}
        </div>

        {resultCount !== null ? (
          <p className="searchBar__count" role="status" aria-live="polite">
            {isFiltered ? (
              <>
                <strong>{resultCount}</strong> of {totalCount} words
              </>
            ) : (
              <>
                <strong>{totalCount}</strong> words
              </>
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default SearchBar;
