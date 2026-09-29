"use client";

import { useState } from "react";
import { LANGUAGES, WORDS } from "../../data/corpus";
import { SEARCH_FIELDS, filterWords } from "../../utils/search";
import NavbarComponent from "../Navbar/Navbar.jsx";
import SearchBar from "../SearchBar/SearchBar.jsx";
import LanguageCard from "../LanguageCard/LanguageCard.jsx";
import WordList from "../WordList/WordList.jsx";
import DownloadMenu from "../DownloadMenu/DownloadMenu.jsx";
import LoginDialog from "../Login/LoginDialog.jsx";
import ImageUploader, { UPLOAD_VARIANTS } from "../ImageUploader/ImageUploader.jsx";
import { wordsToJson, wordsToPairsTxt, buildFilename, downloadTextFile } from "../../utils/exporters";
import "./Home.css";

/** Headline numbers, computed from the corpus rather than hard-coded. */
function summarise() {
  const speakers = LANGUAGES.reduce((total, language) => total + language.speakers, 0);
  const endangered = LANGUAGES.filter((language) => language.status !== "active").length;

  return { speakers, endangered, words: WORDS.length, languages: LANGUAGES.length };
}

/**
 * Landing page.
 *
 * The search bar and the language options come first, before any sign-in,
 * because the corpus is public: reading and downloading words should never be
 * behind an account. Signing in only adds the ability to contribute.
 *
 * `user` is local state and switching it swaps the navbar between its
 * signed-out and signed-in shapes. Nothing here talks to a server.
 */
function HomeComponent() {
  const [user, setUser] = useState(null);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState(SEARCH_FIELDS.ALL);
  const [languageId, setLanguageId] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [loginMode, setLoginMode] = useState(null);
  const [heroImage, setHeroImage] = useState(null);
  const [languageIcons, setLanguageIcons] = useState({});
  const [iconTarget, setIconTarget] = useState(null);
  const [pendingNotice, setPendingNotice] = useState(null);

  const stats = summarise();

  const visibleWords = filterWords(WORDS, { query, languageId, field: scope });
  const languageTotal = WORDS.filter(
    (word) => languageId === "all" || word.languageId === languageId,
  ).length;

  const activeLanguage = LANGUAGES.find((language) => language.id === languageId);
  const languageLabel = activeLanguage?.name ?? "all languages";

  const toggleSelect = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const selectLanguage = (id) => {
    setLanguageId(id);
    // Selections from another language cannot be part of this export.
    setSelectedIds([]);
  };

  /** Stand-in for the sign-in request that will be added with the backend. */
  const handleLogin = ({ name, email }) => {
    const fallback = email.split("@")[0].replace(/[._-]+/g, " ");

    setUser({
      name: name || fallback,
      initials: (name || fallback).slice(0, 2),
      role: "Contributor",
    });
    setLoginMode(null);
    setPendingNotice("Signed in locally. No request was sent — this is the frontend only.");
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedIds([]);
    setPendingNotice("Signed out. Any images you loaded are cleared from the page.");
    setHeroImage(null);
    setLanguageIcons({});
  };

  const downloadSingle = (word) => {
    const filename = buildFilename(`${word.languageName}-${word.word}`, "json");
    downloadTextFile(filename, wordsToJson([word], { languageName: word.languageName }), "application/json");
    setPendingNotice(`Downloading ${word.word} as JSON.`);
  };

  const downloadSearchResults = () => {
    const filename = buildFilename(`search-${query.trim() || "all"}`, "txt");
    downloadTextFile(
      filename,
      wordsToPairsTxt(visibleWords, { meta: { languageName: languageLabel } }),
      "text/plain",
    );
    setPendingNotice(`Downloading ${visibleWords.length} words as TXT pairs.`);
  };

  return (
    <div className="nl-page">
      <NavbarComponent
        user={user}
        onLogin={setLoginMode}
        onLogout={handleLogout}
        activePath="/"
      />

      <main className="nl-main">
        {/* ------------------------------ hero ------------------------------ */}
        <section className="home__hero" aria-labelledby="home-title">
          {heroImage ? (
            <div className="home__heroImage">
              {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
              <img src={heroImage} alt="" />
              <button
                type="button"
                className="home__heroClear"
                onClick={() => setHeroImage(null)}
              >
                <span className="nl-icon nl-icon--close" aria-hidden="true" />
                Remove image
              </button>
            </div>
          ) : null}

          <div className="home__heroContent">
            <span className="nl-eyebrow">Native languages of Guatemala</span>
            <h1 id="home-title" className="home__title">
              Every word is a voice
              <br />
              <span className="home__titleAccent">that should not be lost</span>
            </h1>
            <p className="home__lead">
              A shared corpus of words, pronunciations and usage from the Mayan, Xinka and
              Garifuna communities of Guatemala — open to read, open to download, and built to
              train models that finally sound like the people who spoke these words first.
            </p>

            <div className="home__heroActions">
              <a href="#words" className="nl-btn nl-btn--primary">
                Browse the words
              </a>
              <a href="#languages" className="nl-btn">
                Choose a language
              </a>
              {!user ? (
                <button
                  type="button"
                  className="nl-btn nl-btn--ghost"
                  onClick={() => setLoginMode("signin")}
                >
                  Contribute
                </button>
              ) : (
                <span className="nl-chip">Signed in as {user.name}</span>
              )}
            </div>

            <dl className="home__stats">
              <div>
                <dt>Languages</dt>
                <dd>{stats.languages}</dd>
              </div>
              <div>
                <dt>Speakers</dt>
                <dd>{(stats.speakers / 1_000_000).toFixed(1)}M</dd>
              </div>
              <div>
                <dt>Words recorded</dt>
                <dd>{stats.words}</dd>
              </div>
              <div>
                <dt>At risk</dt>
                <dd className="home__statsWarn">{stats.endangered}</dd>
              </div>
            </dl>
          </div>
        </section>

        {pendingNotice ? (
          <p className="home__notice" role="status" aria-live="polite">
            {pendingNotice}
          </p>
        ) : null}

        {/* ---------------------------- languages --------------------------- */}
        <section id="languages" className="nl-section" aria-labelledby="languages-title">
          <div className="nl-section__head">
            <div>
              <span className="nl-eyebrow">Step 1</span>
              <h2 id="languages-title" className="nl-title">
                Choose a language
              </h2>
              <p className="nl-subtitle">
                Pick a language to narrow the search, or stay on all of them. Selecting a card
                below filters the words immediately.
              </p>
            </div>

            {languageId !== "all" ? (
              <button type="button" className="nl-btn nl-btn--sm" onClick={() => selectLanguage("all")}>
                Show all languages
              </button>
            ) : null}
          </div>

          <ul className="home__languages">
            {LANGUAGES.map((language) => (
              <li key={language.id}>
                <LanguageCard
                  language={language}
                  active={languageId === language.id}
                  wordCount={WORDS.filter((word) => word.languageId === language.id).length}
                  onSelect={selectLanguage}
                  iconUrl={languageIcons[language.id] ?? null}
                  onIconUpload={(id) => setIconTarget(id)}
                />
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------ words ---------------------------- */}
        <section id="words" className="nl-section" aria-labelledby="words-title">
          <div className="nl-section__head">
            <div>
              <span className="nl-eyebrow">Step 2</span>
              <h2 id="words-title" className="nl-title">
                Search the corpus
              </h2>
              <p className="nl-subtitle">
                Search a word in its own language, in translation, or both. Searching is open to
                everyone — no account needed.
              </p>
            </div>
          </div>

          <div className="home__searchRow">
            <SearchBar
              value={query}
              onChange={setQuery}
              scope={scope}
              onScopeChange={setScope}
              resultCount={visibleWords.length}
              totalCount={languageTotal}
              placeholder={
                activeLanguage
                  ? `Search ${activeLanguage.name} — try “jun” or “water”`
                  : "Search a word or its translation — try “jun” or “water”"
              }
            />
          </div>

          <div className="home__wordsLayout">
            <div>
              {selectedIds.length > 0 ? (
                <div className="home__selectionBar">
                  <span>
                    <strong>{selectedIds.length}</strong> selected for export
                  </span>
                  <button
                    type="button"
                    className="nl-btn nl-btn--sm nl-btn--ghost"
                    onClick={() => setSelectedIds([])}
                  >
                    Clear selection
                  </button>
                </div>
              ) : null}

              <WordList
                words={visibleWords}
                query={query}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onDownloadSingle={downloadSingle}
                onClearSearch={() => setQuery("")}
                showLanguage={languageId === "all"}
              />
            </div>

            <aside className="home__sidebar" aria-label="Export and media">
              <DownloadMenu
                words={visibleWords}
                languageName={languageLabel}
                selectedIds={selectedIds}
                baseName={activeLanguage?.id ?? "native-languages"}
              />

              <button
                type="button"
                className="nl-btn nl-btn--block home__downloadSearch"
                onClick={downloadSearchResults}
                disabled={visibleWords.length === 0}
              >
                <span className="nl-icon nl-icon--download" aria-hidden="true" />
                Download these results
              </button>

              <ImageUploader
                variant={UPLOAD_VARIANTS.BANNER}
                value={heroImage}
                onChange={(dataUrl) => setHeroImage(dataUrl)}
                label="Presentation image"
                description="Shown at the top of this page. Drop an image or choose a file."
              />

              {iconTarget ? (
                <ImageUploader
                  variant={UPLOAD_VARIANTS.ICON}
                  value={languageIcons[iconTarget] ?? null}
                  onChange={(dataUrl) =>
                    setLanguageIcons((current) => ({ ...current, [iconTarget]: dataUrl }))
                  }
                  label={`Icon for ${
                    LANGUAGES.find((language) => language.id === iconTarget)?.name ?? "language"
                  }`}
                  description="Square images only, up to 1 MB."
                  maxSizeMB={1}
                />
              ) : null}

              {iconTarget ? (
                <button
                  type="button"
                  className="nl-btn nl-btn--sm nl-btn--ghost nl-btn--block"
                  onClick={() => setIconTarget(null)}
                >
                  Done with icons
                </button>
              ) : null}
            </aside>
          </div>
        </section>

        {/* --------------------------- contribute -------------------------- */}
        <section id="contribute" className="nl-section" aria-labelledby="contribute-title">
          <div className="home__contribute nl-panel">
            <div>
              <span className="nl-eyebrow">Step 3</span>
              <h2 id="contribute-title" className="nl-title">
                Add what you know
              </h2>
              <p className="nl-subtitle">
                A word is only safe when several people agree on it. Contributors record the
                pronunciation they were taught, the situations it is used in, and review what
                others have added.
              </p>
            </div>

            <button
              type="button"
              className="nl-btn nl-btn--primary"
              onClick={() => setLoginMode(user ? "signup" : "signin")}
            >
              {user ? "Invite a contributor" : "Sign in to contribute"}
            </button>
          </div>
        </section>
      </main>

      <footer className="home__footer">
        <div className="nl-container home__footerInner">
          <p>Native Languages — a corpus for the languages of Guatemala.</p>
          <p className="home__footerNote">
            Frontend demonstration. Sample entries are placeholders and are not yet verified by
            speakers.
          </p>
        </div>
      </footer>

      <LoginDialog
        open={loginMode !== null}
        mode={loginMode ?? "signin"}
        onClose={() => setLoginMode(null)}
        onSubmit={handleLogin}
      />
    </div>
  );
}

export default HomeComponent;
