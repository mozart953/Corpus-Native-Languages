"use client";

import { Languages } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import "./LanguageToggle.css";

/**
 * Interface language switch.
 *
 * The available locales come from the API's Locale table, so adding a language
 * later does not require a frontend change. Each option falls back to its short
 * code when no dedicated label key exists yet.
 */
export default function LanguageToggle({ className = "" }) {
  const { locale, locales, changeLocale, t, has, loading } = useI18n();

  if (!Array.isArray(locales) || locales.length < 2) return null;

  return (
    <div
      className={`languageToggle ${className}`}
      role="group"
      aria-label={t("languageToggle.label")}
    >
      <Languages className="languageToggle__icon" aria-hidden="true" />
      {locales.map((item) => {
        const labelKey = `languageToggle.${item.code}`;
        const label = has(labelKey) ? t(labelKey) : item.code.toUpperCase();
        const active = locale === item.code;

        return (
          <button
            key={item.code}
            type="button"
            className={`languageToggle__option ${active ? "is-active" : ""}`}
            aria-pressed={active}
            aria-label={item.label ?? item.code}
            title={item.label ?? item.code}
            onClick={() => changeLocale(item.code)}
            disabled={loading && !active}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
