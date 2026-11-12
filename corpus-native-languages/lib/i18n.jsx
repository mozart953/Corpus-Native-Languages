"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiFetch } from "./api";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE,
  interpolate,
  isLocaleCode,
} from "./locale";

const I18nContext = createContext(null);

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function readStoredLocale() {
  try {
    return window.localStorage.getItem(LOCALE_STORAGE);
  } catch {
    return null;
  }
}

function persistLocale(code) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE, code);
  } catch {
    // Private browsing can block storage; the in-memory choice still works.
  }

  // The cookie lets the root layout render the chosen language on the next
  // request, before any client code runs.
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(
    code,
  )}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

/**
 * Client translation context.
 *
 * The root layout passes the server-rendered copy in, so components can call
 * `t()` during the first render without a key flash. Switching languages
 * fetches the merged copy for the new locale and updates every consumer; the
 * choice is stored in a cookie so the next server render starts there.
 */
export function I18nProvider({
  initialLocale = DEFAULT_LOCALE,
  initialMessages = {},
  initialLocales = [],
  children,
}) {
  const [locale, setLocale] = useState(
    isLocaleCode(initialLocale) ? initialLocale : DEFAULT_LOCALE,
  );
  const [messages, setMessages] = useState(initialMessages ?? {});
  const [locales, setLocales] = useState(initialLocales ?? []);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);

  const apply = useCallback((data) => {
    if (!data) return;
    const nextLocale = isLocaleCode(data.locale) ? data.locale : DEFAULT_LOCALE;
    setLocale(nextLocale);
    setMessages(data.messages ?? {});
    setLocales(data.locales ?? []);
    document.documentElement.lang = nextLocale;
  }, []);

  const load = useCallback(
    async (code) => {
      setLoading(true);
      try {
        const response = await apiFetch(
          `/content/${encodeURIComponent(code)}`,
        );
        apply(response?.data);
      } catch {
        // Keep the current copy when the API is unavailable. The language
        // toggle stays usable and a later attempt can succeed.
      } finally {
        setLoading(false);
      }
    },
    [apply],
  );

  const changeLocale = useCallback(
    async (code) => {
      if (!isLocaleCode(code)) return;

      persistLocale(code);

      if (code === locale) return;

      setLoading(true);
      try {
        const response = await apiFetch(
          `/content/${encodeURIComponent(code)}`,
        );
        apply(response?.data);
      } catch {
        // A failed switch keeps the previous language rather than blanking
        // the interface.
      } finally {
        setLoading(false);
      }
    },
    [apply, locale],
  );

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const stored = readStoredLocale();
    const serverHasCopy = Object.keys(initialMessages ?? {}).length > 0;
    const target =
      stored && isLocaleCode(stored) && stored !== initialLocale
        ? stored
        : serverHasCopy
          ? null
          : initialLocale;

    if (!target) return undefined;

    // Deferred so the first client render commits before the reconciliation
    // fetch starts; this also keeps the effect free of synchronous setState.
    const timer = window.setTimeout(() => {
      load(target);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialLocale, initialMessages, load]);

  const t = useCallback(
    (key, vars) => {
      const template = messages[key];
      if (template === undefined || template === null) return key;
      return interpolate(template, vars);
    },
    [messages],
  );

  const has = useCallback((key) => messages[key] !== undefined, [messages]);

  const value = useMemo(
    () => ({
      locale,
      locales,
      messages,
      loading,
      t,
      has,
      changeLocale,
      refresh: () => load(locale),
    }),
    [locale, locales, messages, loading, t, has, changeLocale, load],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Read the translation context. A safe fallback keeps isolated renders usable. */
export function useI18n() {
  const context = useContext(I18nContext);

  if (context) return context;

  return {
    locale: DEFAULT_LOCALE,
    locales: [],
    messages: {},
    loading: false,
    t: (key) => key,
    has: () => false,
    changeLocale: async () => {},
    refresh: async () => {},
  };
}
