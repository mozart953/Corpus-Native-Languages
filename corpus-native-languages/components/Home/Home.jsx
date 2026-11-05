"use client";

import { useEffect, useState } from "react";
import { LANGUAGES, WORDS } from "../../data/corpus";
import { SEARCH_FIELDS, filterWords } from "../../utils/search";
import { apiFetch } from "../../lib/api";
import { useCorpusAuth } from "../../lib/useCorpusAuth";
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
function summarise(languages, words) {
  const speakers = languages.reduce((total, language) => total + language.speakers, 0);
  const endangered = languages.filter((language) => language.status !== "active").length;

  return {
    speakers,
    endangered,
    words: words.length,
    languages: languages.length,
  };
}

/**
 * Landing page.
 *
 * The search bar and the language options come first, before any sign-in,
 * because the corpus is public: reading and downloading words should never be
 * behind an account. Signing in only adds the ability to contribute.
 *
 * The corpus is fetched from the Express API. The bundled fixtures remain the
 * initial render and the fallback when the API is unavailable, so the page
 * still works during frontend-only development.
 */
function HomeComponent() {
  const {
    user,
    submitting: authSubmitting,
    error: authError,
    setError: setAuthError,
    login,
    logout,
  } = useCorpusAuth();

  const [languages, setLanguages] = useState(LANGUAGES);
  const [words, setWords] = useState(WORDS);
  const [corpusSource, setCorpusSource] = useState("fixtures");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState(SEARCH_FIELDS.ALL);
  const [languageId, setLanguageId] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [loginMode, setLoginMode] = useState(null);
  const [heroImage, setHeroImage] = useState(null);
  const [languageIcons, setLanguageIcons] = useState({});
  const [iconTarget, setIconTarget] = useState(null);
  const [pendingNotice, setPendingNotice] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCorpus() {
      try {
        const [languageResponse, wordResponse] = await Promise.all([
          apiFetch("/languages?limit=100"),
          apiFetch("/words?limit=100&page=1"),
        ]);

        if (cancelled) return;

        const nextLanguages = languageResponse?.data ?? [];
        const nextWords = wordResponse?.data ?? [];

        if (nextLanguages.length > 0) setLanguages(nextLanguages);
        if (nextWords.length > 0) setWords(nextWords);
        setCorpusSource("api");
      } catch {
        if (cancelled) return;
        setCorpusSource("fixtures");
        setPendingNotice(
          "The corpus API is unavailable right now — showing the bundled sample data.",
        );
      }
    }

    loadCorpus();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = summarise(languages, words);

  const visibleWords = filterWords(words, { query, languageId, field: scope });
  const languageTotal = words.filter(
    (word) => languageId === "all" || word.languageId === languageId,
  ).length;

  const activeLanguage = languages.find((language) => language.id === languageId);
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

  const handleLogin = async ({ name, email, password }) => {
    const ok = await login({
      mode: loginMode ?? "signin",
      name,
      email,
      password,
    });

    if (!ok) return;

    setLoginMode(null);
    setPendingNotice(
      "Signed in. Your session refreshes while you are active and expires after 30 minutes of inactivity.",
    );
  };

  const handleLogout = async () => {
    await logout();
    setSelectedIds([]);
    setPendingNotice("Signed out. Any images you loaded are cleared from the page.");
    setHeroImage(null);
    setLanguageIcons({});
  };

  const openLogin = (mode) => {
    setAuthError(null);
    setLoginMode(mode);
  };

  const closeLogin = () => {
    setAuthError(null);
    setLoginMode(null);
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
        onLogin={openLogin}
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
                  onClick={() => openLogin("signin")}
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
            {languages.map((language) => (
              <li key={language.id}>
                <LanguageCard
                  language={language}
                  active={languageId === language.id}
                  wordCount={words.filter((word) => word.languageId === language.id).length}
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
                    languages.find((language) => language.id === iconTarget)?.name ?? "language"
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
              onClick={() => openLogin(user ? "signup" : "signin")}
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
            {corpusSource === "api"
              ? "Corpus loaded from the API. Entries marked pending are awaiting community review."
              : "Sample entries are placeholders and are not yet verified by speakers."}
          </p>
        </div>
      </footer>

      <LoginDialog
        open={loginMode !== null}
        mode={loginMode ?? "signin"}
        onClose={closeLogin}
        onSubmit={handleLogin}
        submitting={authSubmitting}
        error={authError}
      />
    </div>
  );
}

export default HomeComponent;
