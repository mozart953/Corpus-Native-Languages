"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Download,
  Image as ImageIcon,
  Languages,
  PenLine,
  Settings2,
} from "lucide-react";
import { LANGUAGES, WORDS } from "../../data/corpus";
import { SEARCH_FIELDS, filterWords } from "../../utils/search";
import { apiFetch, apiAssetUrl } from "../../lib/api";
import { useCorpusAuth } from "../../lib/useCorpusAuth";
import { useI18n } from "../../lib/i18n";
import { Button } from "@/components/ui/button";
import NavbarComponent from "../Navbar/Navbar.jsx";
import SearchBar from "../SearchBar/SearchBar.jsx";
import LanguageCard from "../LanguageCard/LanguageCard.jsx";
import WordList from "../WordList/WordList.jsx";
import DownloadMenu from "../DownloadMenu/DownloadMenu.jsx";
import LoginDialog from "../Login/LoginDialog.jsx";
import LanguageToggle from "../LanguageToggle/LanguageToggle.jsx";
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
    notice: authNotice,
    setError: setAuthError,
    clearNotice: clearAuthNotice,
    login,
    logout,
  } = useCorpusAuth();
  const { t, locale } = useI18n();

  const [languages, setLanguages] = useState(LANGUAGES);
  const [words, setWords] = useState(WORDS);
  const [corpusSource, setCorpusSource] = useState("fixtures");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState(SEARCH_FIELDS.ALL);
  const [languageId, setLanguageId] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [loginMode, setLoginMode] = useState(null);
  const [siteImage, setSiteImage] = useState(null);
  const [pendingNotice, setPendingNotice] = useState(null);

  useEffect(() => {
    let cancelled = false;

    apiFetch("/site-images/home-image")
      .then((response) => {
        if (!cancelled && response?.data?.url) setSiteImage(response.data);
      })
      .catch(() => {
        // The corpus still works when presentation media is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCorpus() {
      try {
        // The public list is the only place that follows the interface
        // language; admin and review desks always read the canonical English.
        const [languageResponse, wordResponse] = await Promise.all([
          apiFetch("/languages?limit=100"),
          apiFetch(`/words?limit=100&page=1&locale=${encodeURIComponent(locale)}`),
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
        setPendingNotice({ key: "home.notice.apiUnavailable" });
      }
    }

    loadCorpus();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const stats = summarise(languages, words);

  const visibleWords = filterWords(words, { query, languageId, field: scope });
  const languageTotal = words.filter(
    (word) => languageId === "all" || word.languageId === languageId,
  ).length;

  const activeLanguage = languages.find((language) => language.id === languageId);
  const languageLabel = activeLanguage?.name ?? t("home.words.allLanguages");

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
    setPendingNotice({ key: "home.notice.signedIn" });
  };

  const handleLogout = async () => {
    await logout();
    setSelectedIds([]);
    setPendingNotice({ key: "home.notice.signedOut" });
  };

  const openLogin = (mode) => {
    setAuthError(null);
    clearAuthNotice();
    setLoginMode(mode);
  };

  const closeLogin = () => {
    setAuthError(null);
    clearAuthNotice();
    setLoginMode(null);
  };

  const downloadSingle = (word) => {
    const filename = buildFilename(`${word.languageName}-${word.word}`, "json");
    downloadTextFile(filename, wordsToJson([word], { languageName: word.languageName }), "application/json");
    setPendingNotice({ key: "home.notice.downloadingJson", vars: { word: word.word } });
  };

  const downloadSearchResults = () => {
    const filename = buildFilename(`search-${query.trim() || "all"}`, "txt");
    downloadTextFile(
      filename,
      wordsToPairsTxt(visibleWords, { meta: { languageName: languageLabel } }),
      "text/plain",
    );
    setPendingNotice({
      key: "home.notice.downloadingResults",
      vars: { count: visibleWords.length },
    });
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
          <div className="home__heroPanel">
            <div className="home__heroContent">
            <div className="home__heroTop">
              <span className="nl-eyebrow">{t("home.hero.eyebrow")}</span>
              <LanguageToggle />
            </div>
            <h1 id="home-title" className="home__title">
              {t("home.hero.titleLine1")}
              <br />
              <span className="home__titleAccent">{t("home.hero.titleLine2")}</span>
            </h1>
            <p className="home__lead">{t("home.hero.lead")}</p>

            <div className="home__heroActions">
              <Button asChild size="lg" className="h-11 px-5 text-[0.9rem] font-semibold">
                <a href="#words">
                  <BookOpen className="size-4" aria-hidden="true" />
                  {t("home.hero.browse")}
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 px-5 text-[0.9rem] font-semibold"
              >
                <a href="#languages">
                  <Languages className="size-4" aria-hidden="true" />
                  {t("home.hero.chooseLanguage")}
                </a>
              </Button>
              {!user ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  className="h-11 px-4 text-[0.9rem]"
                  onClick={() => openLogin("signin")}
                >
                  <PenLine className="size-4" aria-hidden="true" />
                  {t("home.hero.contribute")}
                </Button>
              ) : (
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="h-11 px-4 text-[0.9rem]"
                >
                  <Link href="/contribute">
                    <PenLine className="size-4" aria-hidden="true" />
                    {t("home.hero.openDesk")}
                  </Link>
                </Button>
              )}
            </div>

            <dl className="home__stats">
              <div>
                <dt>{t("home.stats.languages")}</dt>
                <dd>{stats.languages}</dd>
              </div>
              <div>
                <dt>{t("home.stats.speakers")}</dt>
                <dd>{(stats.speakers / 1_000_000).toFixed(1)}M</dd>
              </div>
              <div>
                <dt>{t("home.stats.words")}</dt>
                <dd>{stats.words}</dd>
              </div>
              <div>
                <dt>{t("home.stats.atRisk")}</dt>
                <dd className="home__statsWarn">{stats.endangered}</dd>
              </div>
            </dl>
            </div>

            {siteImage ? (
              <figure className="home__heroMedia">
                {/* eslint-disable-next-line @next/next/no-img-element -- API-hosted asset */}
                <img
                  src={apiAssetUrl(siteImage.url)}
                  alt={siteImage.alt || t("home.image.alt")}
                />
                <figcaption>
                  <span className="home__heroMediaLabel">
                    <ImageIcon className="size-3.5" aria-hidden="true" />
                    {t("home.image.presentation")}
                  </span>
                  {user?.roleKey === "admin" ? (
                    <Link href="/admin" className="home__heroManage">
                      <Settings2 className="size-3.5" aria-hidden="true" />
                      {t("home.image.manage")}
                    </Link>
                  ) : (
                    <span className="home__heroMediaNote">{t("home.image.curated")}</span>
                  )}
                </figcaption>
              </figure>
            ) : (
              <div className="home__heroMark" aria-hidden="true">
                <span>NL</span>
                <small>
                  {t("home.image.markCorpus")}
                  <br />
                  {t("home.image.markGuatemala")}
                </small>
              </div>
            )}
          </div>
        </section>

        {pendingNotice ? (
          <p className="home__notice" role="status" aria-live="polite">
            {t(pendingNotice.key, pendingNotice.vars)}
          </p>
        ) : null}

        {/* ---------------------------- languages --------------------------- */}
        <section id="languages" className="nl-section" aria-labelledby="languages-title">
          <div className="nl-section__head">
            <div>
              <span className="nl-eyebrow">{t("home.languages.eyebrow")}</span>
              <h2 id="languages-title" className="nl-title">
                {t("home.languages.title")}
              </h2>
              <p className="nl-subtitle">{t("home.languages.subtitle")}</p>
            </div>

            {languageId !== "all" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selectLanguage("all")}
              >
                {t("home.languages.showAll")}
              </Button>
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
                />
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------ words ---------------------------- */}
        <section id="words" className="nl-section" aria-labelledby="words-title">
          <div className="nl-section__head">
            <div>
              <span className="nl-eyebrow">{t("home.words.eyebrow")}</span>
              <h2 id="words-title" className="nl-title">
                {t("home.words.title")}
              </h2>
              <p className="nl-subtitle">{t("home.words.subtitle")}</p>
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
                  ? t("home.words.placeholderLanguage", { language: activeLanguage.name })
                  : t("home.words.placeholder")
              }
            />
          </div>

          <div className="home__wordsLayout">
            <div>
              {selectedIds.length > 0 ? (
                <div className="home__selectionBar">
                  <span>
                    {t("home.words.selectedForExport", { count: selectedIds.length })}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds([])}
                  >
                    {t("home.words.clearSelection")}
                  </Button>
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

            <aside className="home__sidebar" aria-label={t("home.words.exportAside")}>
              <DownloadMenu
                words={visibleWords}
                languageName={languageLabel}
                selectedIds={selectedIds}
                baseName={activeLanguage?.id ?? "native-languages"}
              />

              <Button
                type="button"
                variant="outline"
                className="home__downloadSearch"
                onClick={downloadSearchResults}
                disabled={visibleWords.length === 0}
              >
                <Download className="size-4" aria-hidden="true" />
                {t("home.words.downloadResults")}
              </Button>
            </aside>
          </div>
        </section>

        {/* --------------------------- contribute -------------------------- */}
        <section id="contribute" className="nl-section" aria-labelledby="contribute-title">
          <div className="home__contribute nl-panel">
            <div>
              <span className="nl-eyebrow">{t("home.contribute.eyebrow")}</span>
              <h2 id="contribute-title" className="nl-title">
                {t("home.contribute.title")}
              </h2>
              <p className="nl-subtitle">{t("home.contribute.subtitle")}</p>
            </div>

            {user ? (
              <Button asChild size="lg" className="h-11 px-5 text-[0.9rem]">
                <Link href="/contribute">{t("home.contribute.go")}</Link>
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                className="h-11 px-5 text-[0.9rem]"
                onClick={() => openLogin("signup")}
              >
                {t("home.contribute.createAccount")}
              </Button>
            )}
          </div>
        </section>
      </main>

      <footer className="home__footer">
        <div className="nl-container home__footerInner">
          <p>{t("home.footer.tagline")}</p>
          <p className="home__footerNote">
            {corpusSource === "api"
              ? t("home.footer.apiNote")
              : t("home.footer.fixtureNote")}
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
        notice={authNotice}
      />
    </div>
  );
}

export default HomeComponent;
