"use client";

import { useMemo, useState } from "react";
import WordCard from "../WordCard/WordCard.jsx";
import "./WordList.css";

/** Cards shown per page. Keeps the DOM small on a large corpus. */
const PAGE_SIZE = 12;

/**
 * Grid of word cards.
 *
 * Renders three states on purpose: results, "nothing matched" with a way out,
 * and "no words yet" for a language nobody has contributed to. That
 * difference matters — an empty search result and an empty language are very
 * different situations for a visitor.
 */
function WordList({
  words = [],
  query = "",
  selectedIds = [],
  onToggleSelect = null,
  onDownloadSingle = null,
  onClearSearch = null,
  showLanguage = true,
}) {
  const [page, setPage] = useState(1);

  // A new result set should always start from the top of the list. Adjusting
  // during render (rather than in an effect) avoids a second commit and the
  // extra render pass an effect would cause.
  const listKey = `${words.length}:${words[0]?.id ?? ""}:${query}`;
  const [lastKey, setLastKey] = useState(listKey);

  if (lastKey !== listKey) {
    setLastKey(listKey);
    setPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(words.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = useMemo(
    () => words.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [words, safePage],
  );

  if (words.length === 0) {
    const isFiltered = query.trim().length > 0;

    return (
      <div className="wordList__empty" role="status">
        <span className="wordList__emptyMark" aria-hidden="true">
          {isFiltered ? "∅" : "◍"}
        </span>
        <h3 className="wordList__emptyTitle">
          {isFiltered ? "No words match your search" : "No words here yet"}
        </h3>
        <p className="wordList__emptyText">
          {isFiltered
            ? `Nothing in this selection contains “${query.trim()}”. Try a shorter fragment, or switch the scope to “All”.`
            : "This language has no entries yet. Contributions from its speakers are what build the corpus."}
        </p>
        {isFiltered && onClearSearch ? (
          <button
            type="button"
            className="nl-btn nl-btn--sm nl-btn--primary"
            onClick={onClearSearch}
          >
            Clear search
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <ul className="wordList">
        {visible.map((word) => (
          <li key={word.id} className="wordList__item">
            <WordCard
              word={word}
              query={query}
              selected={selectedIds.includes(word.id)}
              onToggleSelect={onToggleSelect}
              showLanguage={showLanguage}
              onDownloadSingle={onDownloadSingle}
            />
          </li>
        ))}
      </ul>

      {pageCount > 1 ? (
        <nav className="wordList__pager" aria-label="Word pages">
          <button
            type="button"
            className="nl-btn nl-btn--sm"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={safePage === 1}
          >
            Previous
          </button>

          <span className="wordList__pageInfo">
            Page <strong>{safePage}</strong> of {pageCount}
          </span>

          <button
            type="button"
            className="nl-btn nl-btn--sm"
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            disabled={safePage === pageCount}
          >
            Next
          </button>
        </nav>
      ) : null}
    </>
  );
}

export default WordList;
