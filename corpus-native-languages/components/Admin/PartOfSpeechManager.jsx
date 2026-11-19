"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "../Moderation/StatusBadge.jsx";
import { useI18n } from "../../lib/i18n";
import "./Admin.css";

const FALLBACK_LOCALES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
];

function labelsFor(row, localeCodes) {
  const translations = new Map(
    (row?.translations ?? []).map((item) => [item.locale, item.label]),
  );
  return Object.fromEntries(
    localeCodes.map((code) => [code, translations.get(code) ?? ""]),
  );
}

function nonEmpty(labels) {
  return Object.fromEntries(
    Object.entries(labels)
      .map(([code, label]) => [code, String(label ?? "").trim()])
      .filter(([, label]) => label.length > 0),
  );
}

/**
 * Admin editor for the part-of-speech lookup.
 *
 * Rows are reference data: a word stores only the stable code, while each
 * locale's wording lives in the translation table. Deleting a row deactivates
 * it, so words that already use it keep their label and the option can be
 * restored later.
 */
export default function PartOfSpeechManager() {
  const { t, locale, locales } = useI18n();
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [newLabels, setNewLabels] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const localeOptions = useMemo(() => {
    const list = (locales?.length ? locales : FALLBACK_LOCALES).map((item) => ({
      code: item.code,
      label: item.label || item.code.toUpperCase(),
    }));
    return list.length ? list : FALLBACK_LOCALES;
  }, [locales]);

  const localeCodes = useMemo(
    () => localeOptions.map((item) => item.code),
    [localeOptions],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch(
        `/part-of-speech/admin?locale=${encodeURIComponent(locale)}`,
      );
      const data = response?.data ?? [];
      setRows(data);
      setDrafts(
        Object.fromEntries(
          data.map((row) => [row.code, labelsFor(row, localeCodes)]),
        ),
      );
    } catch (cause) {
      setError(cause?.message ?? t("partOfSpeech.error.load"));
    } finally {
      setLoading(false);
    }
  }, [locale, localeCodes, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; updates happen after the awaited API call
    load();
  }, [load]);

  const setDraftLabel = (code, localeCode, value) => {
    setDrafts((current) => ({
      ...current,
      [code]: { ...current[code], [localeCode]: value },
    }));
    setError(null);
    setNotice(null);
  };

  const setNewLabel = (localeCode, value) => {
    setNewLabels((current) => ({ ...current, [localeCode]: value }));
    setError(null);
    setNotice(null);
  };

  const create = async (event) => {
    event.preventDefault();
    const translations = nonEmpty(newLabels);

    if (!translations.en) {
      setError(t("partOfSpeech.error.englishRequired"));
      return;
    }

    setCreating(true);
    setError(null);
    setNotice(null);

    try {
      await apiFetch("/part-of-speech", {
        method: "POST",
        body: { code: translations.en, translations },
      });
      setNewLabels(Object.fromEntries(localeCodes.map((code) => [code, ""])));
      setNotice(t("partOfSpeech.created"));
      await load();
    } catch (cause) {
      setError(cause?.message ?? t("partOfSpeech.error.save"));
    } finally {
      setCreating(false);
    }
  };

  const save = async (row) => {
    const translations = nonEmpty(drafts[row.code] ?? {});

    if (!translations.en) {
      setError(t("partOfSpeech.error.englishRequired"));
      return;
    }

    setBusyKey(row.code);
    setError(null);
    setNotice(null);

    try {
      await apiFetch(`/part-of-speech/${encodeURIComponent(row.code)}`, {
        method: "PATCH",
        body: { translations },
      });
      setNotice(t("partOfSpeech.saved", { label: translations[locale] ?? row.label }));
      await load();
    } catch (cause) {
      setError(cause?.message ?? t("partOfSpeech.error.save"));
    } finally {
      setBusyKey(null);
    }
  };

  const deactivate = async (row) => {
    if (
      !window.confirm(
        t("partOfSpeech.confirmDeactivate", { label: row.label }),
      )
    ) {
      return;
    }

    setBusyKey(row.code);
    setError(null);
    setNotice(null);

    try {
      await apiFetch(`/part-of-speech/${encodeURIComponent(row.code)}`, {
        method: "DELETE",
      });
      setNotice(t("partOfSpeech.deactivated", { label: row.label }));
      await load();
    } catch (cause) {
      setError(cause?.message ?? t("partOfSpeech.error.save"));
    } finally {
      setBusyKey(null);
    }
  };

  const restore = async (row) => {
    setBusyKey(row.code);
    setError(null);
    setNotice(null);

    try {
      await apiFetch(
        `/part-of-speech/${encodeURIComponent(row.code)}/restore`,
        { method: "POST" },
      );
      setNotice(t("partOfSpeech.restored", { label: row.label }));
      await load();
    } catch (cause) {
      setError(cause?.message ?? t("partOfSpeech.error.save"));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="partOfSpeech">
      {error ? (
        <p className="roleError" role="alert">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className="roleNotice" role="status">
          {notice}
        </p>
      ) : null}

      <section className="roleSection">
        <div className="roleSection__head">
          <h2 className="roleSection__title">{t("partOfSpeech.createTitle")}</h2>
          <span className="roleSection__hint">
            {t("partOfSpeech.createHint")}
          </span>
        </div>

        <form className="roleCard partOfSpeech__create" onSubmit={create}>
          <div className="partOfSpeech__fields">
            {localeOptions.map((item) => (
              <div className="roleField partOfSpeech__field" key={item.code}>
                <Label className="roleLabel" htmlFor={`new-pos-${item.code}`}>
                  {t("partOfSpeech.labelIn", { locale: item.label })}
                </Label>
                <Input
                  id={`new-pos-${item.code}`}
                  className="roleInput"
                  value={newLabels[item.code] ?? ""}
                  onChange={(event) =>
                    setNewLabel(item.code, event.target.value)
                  }
                  placeholder={t("partOfSpeech.labelPlaceholder", {
                    locale: item.label,
                  })}
                />
              </div>
            ))}
          </div>
          <div className="roleActions partOfSpeech__actions">
            <Button type="submit" size="sm" disabled={creating}>
              {creating
                ? t("partOfSpeech.creating")
                : t("partOfSpeech.create")}
            </Button>
            <span className="roleHint">{t("partOfSpeech.codeHint")}</span>
          </div>
        </form>
      </section>

      <section className="roleSection">
        <div className="roleSection__head">
          <h2 className="roleSection__title">{t("partOfSpeech.listTitle")}</h2>
          <span className="roleSection__hint">
            {t("partOfSpeech.listHint", { count: rows.length })}
          </span>
        </div>

        {loading ? (
          <div className="roleEmpty">{t("partOfSpeech.loading")}</div>
        ) : rows.length === 0 ? (
          <div className="roleEmpty">{t("partOfSpeech.none")}</div>
        ) : (
          <div className="roleList">
            {rows.map((row) => {
              const draft = drafts[row.code] ?? {};
              const original = labelsFor(row, localeCodes);
              const dirty = localeCodes.some(
                (code) => (draft[code] ?? "") !== (original[code] ?? ""),
              );

              return (
                <article
                  key={row.code}
                  className={`roleCard partOfSpeech__card ${
                    row.isActive ? "" : "partOfSpeech__card--inactive"
                  }`}
                >
                  <div className="roleCard__head">
                    <div className="partOfSpeech__identity">
                      <h3 className="roleCard__title">{row.label}</h3>
                      <span className="partOfSpeech__code">{row.code}</span>
                    </div>
                    <StatusBadge
                      state={row.isActive ? "active" : "deactivated"}
                    />
                  </div>

                  <div className="roleCard__meta">
                    <span>
                      {t("partOfSpeech.wordCount", { count: row.wordCount })}
                    </span>
                    <span>
                      {t("partOfSpeech.languagesHint", {
                        count: localeOptions.length,
                      })}
                    </span>
                  </div>

                  <div className="partOfSpeech__fields">
                    {localeOptions.map((item) => (
                      <div
                        className="roleField partOfSpeech__field"
                        key={item.code}
                      >
                        <Label
                          className="roleLabel"
                          htmlFor={`pos-${row.code}-${item.code}`}
                        >
                          {t("partOfSpeech.labelIn", { locale: item.label })}
                        </Label>
                        <Input
                          id={`pos-${row.code}-${item.code}`}
                          className="roleInput"
                          value={draft[item.code] ?? ""}
                          onChange={(event) =>
                            setDraftLabel(
                              row.code,
                              item.code,
                              event.target.value,
                            )
                          }
                          disabled={busyKey === row.code}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="roleActions partOfSpeech__actions">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyKey === row.code || !dirty}
                      onClick={() => save(row)}
                    >
                      {busyKey === row.code
                        ? t("partOfSpeech.saving")
                        : t("partOfSpeech.save")}
                    </Button>

                    {row.isActive ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-border text-foreground hover:bg-accent"
                        disabled={busyKey === row.code}
                        onClick={() => deactivate(row)}
                      >
                        {t("partOfSpeech.deactivate")}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyKey === row.code}
                        onClick={() => restore(row)}
                      >
                        {t("partOfSpeech.restore")}
                      </Button>
                    )}

                    {row.isActive ? (
                      <span className="roleHint">
                        {t("partOfSpeech.deactivateHint", {
                          count: row.wordCount,
                        })}
                      </span>
                    ) : (
                      <span className="roleHint">
                        {t("partOfSpeech.inactiveHint")}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
