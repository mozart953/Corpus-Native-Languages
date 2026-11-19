"use client";

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SEARCH_FIELDS } from "../../utils/search";
import { useI18n } from "../../lib/i18n";
import "./SearchBar.css";

/** Scope options, in the order they appear in the toggle group. */
const SCOPES = [
  { id: SEARCH_FIELDS.ALL, labelKey: "search.scope.all", hintKey: "search.scope.allHint" },
  { id: SEARCH_FIELDS.WORD, labelKey: "search.scope.words", hintKey: "search.scope.wordsHint" },
  {
    id: SEARCH_FIELDS.TRANSLATION,
    labelKey: "search.scope.translations",
    hintKey: "search.scope.translationsHint",
  },
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
  placeholder = null,
  autoFocus = false,
}) {
  const inputRef = useRef(null);
  const { t } = useI18n();

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
        <Search className="searchBar__icon" aria-hidden="true" />
        <Input
          ref={inputRef}
          type="search"
          className="searchBar__input"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? t("search.placeholder")}
          aria-label={t("search.aria")}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          autoFocus={autoFocus}
        />

        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="searchBar__clear"
            onClick={() => {
              onChange?.("");
              inputRef.current?.focus();
            }}
            aria-label={t("search.clear")}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
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
          aria-label={t("search.group")}
        >
          {SCOPES.map((option) => (
            <Button
              key={option.id}
              type="button"
              variant="ghost"
              size="sm"
              className={`searchBar__scope ${scope === option.id ? "is-active" : ""}`}
              onClick={() => onScopeChange?.(option.id)}
              aria-pressed={scope === option.id}
              title={t(option.hintKey)}
            >
              {t(option.labelKey)}
            </Button>
          ))}
        </div>

        {resultCount !== null ? (
          <p className="searchBar__count" role="status" aria-live="polite">
            {isFiltered
              ? t("search.countOf", { count: resultCount, total: totalCount })
              : t("search.count", { total: totalCount })}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default SearchBar;
