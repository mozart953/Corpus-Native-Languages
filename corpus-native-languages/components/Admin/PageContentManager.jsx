"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "../../lib/i18n";
import "./Admin.css";

const FALLBACK_LOCALES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
];

/** Keys look like `page.section.name`; the first two parts make the group. */
function splitKey(key) {
  const parts = key.split(".");
  return {
    page: parts[0] || "common",
    section: parts.length > 2 ? parts[1] : "",
    leaf: parts.length > 2 ? parts.slice(2).join(".") : parts.slice(1).join("."),
  };
}

function groupMessages(messages) {
  const pages = new Map();

  for (const [key, value] of Object.entries(messages)) {
    const { page, section } = splitKey(key);
    if (!pages.has(page)) pages.set(page, new Map());
    const sections = pages.get(page);
    const bucket = section || "";
    if (!sections.has(bucket)) sections.set(bucket, []);
    sections.get(bucket).push({ key, value });
  }

  return Array.from(pages.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([page, sections]) => ({
      page,
      sections: Array.from(sections.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([section, entries]) => ({
          section,
          entries: entries.sort((a, b) => a.key.localeCompare(b.key)),
        })),
    }));
}

/**
 * Admin editor for the bundled page copy.
 *
 * The API returns the file defaults, the stored overrides and the merged copy.
 * Only changed keys are sent on save; the backend deletes an override when a
 * value matches the default again, so "reset" is just another write.
 */
export default function PageContentManager() {
  const { t, has, locale: activeLocale, locales, refresh } = useI18n();
  const [locale, setLocale] = useState(
    activeLocale === "es" ? "es" : "en",
  );
  const [defaults, setDefaults] = useState({});
  const [overrides, setOverrides] = useState({});
  const [messages, setMessages] = useState({});
  const [draft, setDraft] = useState({});
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const localeOptions = useMemo(() => {
    const list = (locales?.length ? locales : FALLBACK_LOCALES).map((item) => ({
      code: item.code,
      label: item.label || item.code.toUpperCase(),
    }));
    return list.length ? list : FALLBACK_LOCALES;
  }, [locales]);

  const applyResponse = useCallback((data) => {
    setDefaults(data?.defaults ?? {});
    setOverrides(data?.overrides ?? {});
    setMessages(data?.messages ?? {});
    setDraft(data?.messages ?? {});
  }, []);

  const load = useCallback(
    async (code) => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch(
          `/content/${encodeURIComponent(code)}/admin`,
        );
        applyResponse(response?.data);
      } catch (cause) {
        setError(cause?.message ?? t("pageContent.error.load"));
      } finally {
        setLoading(false);
      }
    },
    [applyResponse, t],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; updates happen after the awaited API call
    load(locale);
  }, [load, locale]);

  const dirtyKeys = useMemo(
    () =>
      Object.keys(draft).filter((key) => (draft[key] ?? "") !== (messages[key] ?? "")),
    [draft, messages],
  );

  const groups = useMemo(() => groupMessages(messages), [messages]);

  const visibleGroups = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return groups;

    return groups
      .map((group) => ({
        ...group,
        sections: group.sections
          .map((section) => ({
            ...section,
            entries: section.entries.filter(
              (entry) =>
                entry.key.toLowerCase().includes(query) ||
                String(draft[entry.key] ?? entry.value)
                  .toLowerCase()
                  .includes(query),
            ),
          }))
          .filter((section) => section.entries.length > 0),
      }))
      .filter((group) => group.sections.length > 0);
  }, [groups, filter, draft]);

  const setValue = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
    setNotice(null);
  };

  const save = async () => {
    if (dirtyKeys.length === 0) {
      setNotice(t("pageContent.noChanges"));
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const payload = Object.fromEntries(
        dirtyKeys.map((key) => [key, draft[key] ?? ""]),
      );
      const response = await apiFetch(`/content/${encodeURIComponent(locale)}`, {
        method: "PUT",
        body: { messages: payload },
      });
      applyResponse(response?.data);
      setNotice(t("pageContent.saved", { locale: locale.toUpperCase() }));
      if (locale === activeLocale) await refresh();
    } catch (cause) {
      setError(cause?.message ?? t("pageContent.error.save"));
    } finally {
      setSaving(false);
    }
  };

  const resetKey = async (key) => {
    const ok = window.confirm(
      t("pageContent.confirmResetKey", { key }),
    );
    if (!ok) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await apiFetch(
        `/content/${encodeURIComponent(locale)}/keys/${encodeURIComponent(key)}`,
        { method: "DELETE" },
      );
      applyResponse(response?.data);
      setNotice(t("pageContent.resetKeyDone", { key }));
      if (locale === activeLocale) await refresh();
    } catch (cause) {
      setError(cause?.message ?? t("pageContent.error.save"));
    } finally {
      setSaving(false);
    }
  };

  const resetAll = async () => {
    const ok = window.confirm(
      t("pageContent.confirmResetAll", { locale: locale.toUpperCase() }),
    );
    if (!ok) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await apiFetch(`/content/${encodeURIComponent(locale)}`, {
        method: "DELETE",
      });
      applyResponse(response?.data);
      setNotice(t("pageContent.resetAllDone", { locale: locale.toUpperCase() }));
      if (locale === activeLocale) await refresh();
    } catch (cause) {
      setError(cause?.message ?? t("pageContent.error.save"));
    } finally {
      setSaving(false);
    }
  };

  const groupLabel = (page) =>
    has(`pageContent.group.${page}`)
      ? t(`pageContent.group.${page}`)
      : page;

  const isLong = (key) =>
    String(draft[key] ?? messages[key] ?? "").length > 90 ||
    String(draft[key] ?? messages[key] ?? "").includes("\n");

  return (
    <div className="pageContent">
      <div className="pageContent__head">
        <div>
          <h2 className="roleSection__title">{t("pageContent.title")}</h2>
          <p className="roleHint">{t("pageContent.description")}</p>
        </div>
        <div className="pageContent__toolbar">
          <label className="roleField pageContent__locale">
            <span className="roleLabel">{t("pageContent.locale")}</span>
            <select
              className="roleSelect"
              value={locale}
              onChange={(event) => setLocale(event.target.value)}
              disabled={saving}
            >
              {localeOptions.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label} ({item.code.toUpperCase()})
                </option>
              ))}
            </select>
          </label>
          <label className="roleField pageContent__search">
            <span className="roleLabel">{t("common.search")}</span>
            <Input
              className="roleInput"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder={t("pageContent.search")}
            />
          </label>
        </div>
      </div>

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

      {loading ? (
        <div className="roleEmpty">{t("pageContent.loading")}</div>
      ) : groups.length === 0 ? (
        <div className="roleEmpty">{t("pageContent.noKeys")}</div>
      ) : (
        <>
          <div className="pageContent__actions">
            <span className="roleHint">
              {dirtyKeys.length > 0
                ? t("pageContent.dirtyCount", { count: dirtyKeys.length })
                : t("pageContent.noChanges")}
            </span>
            <Button type="button" onClick={save} disabled={saving}>
              <Save className="size-4" aria-hidden="true" />
              {saving ? t("pageContent.saving") : t("pageContent.save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetAll}
              disabled={saving || Object.keys(overrides).length === 0}
              className="border-border text-foreground hover:bg-accent"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              {t("pageContent.resetAll")}
            </Button>
          </div>

          {visibleGroups.length === 0 ? (
            <div className="roleEmpty">{t("pageContent.noMatch")}</div>
          ) : (
            <div className="pageContent__groups">
              {visibleGroups.map((group) => (
                <section key={group.page} className="pageContent__group">
                  <div className="pageContent__groupHead">
                    <h3 className="pageContent__groupTitle">
                      {groupLabel(group.page)}
                    </h3>
                    <span className="roleHint">{group.page}</span>
                  </div>

                  {group.sections.map((section) => (
                    <div
                      key={`${group.page}:${section.section}`}
                      className="pageContent__section"
                    >
                      {section.section ? (
                        <span className="pageContent__sectionTitle">
                          {section.section}
                        </span>
                      ) : null}

                      <div className="pageContent__fields">
                        {section.entries.map((entry) => {
                          const value = draft[entry.key] ?? entry.value;
                          const customized = entry.key in overrides;

                          return (
                            <div key={entry.key} className="pageContent__field">
                              <div className="pageContent__fieldHead">
                                <Label
                                  className="roleLabel"
                                  htmlFor={`copy-${entry.key}`}
                                >
                                  {entry.key}
                                </Label>
                                <span
                                  className={`pageContent__badge ${
                                    customized ? "is-custom" : ""
                                  }`}
                                >
                                  {customized
                                    ? t("pageContent.customized")
                                    : t("pageContent.default")}
                                </span>
                                {customized ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="pageContent__reset"
                                    onClick={() => resetKey(entry.key)}
                                    disabled={saving}
                                  >
                                    <RotateCcw
                                      className="size-3.5"
                                      aria-hidden="true"
                                    />
                                    {t("pageContent.reset")}
                                  </Button>
                                ) : null}
                              </div>

                              {isLong(entry.key) ? (
                                <Textarea
                                  id={`copy-${entry.key}`}
                                  className="roleTextarea"
                                  value={value}
                                  onChange={(event) =>
                                    setValue(entry.key, event.target.value)
                                  }
                                />
                              ) : (
                                <Input
                                  id={`copy-${entry.key}`}
                                  className="roleInput"
                                  value={value}
                                  onChange={(event) =>
                                    setValue(entry.key, event.target.value)
                                  }
                                />
                              )}

                              {value !== defaults[entry.key] ? (
                                <span className="pageContent__default">
                                  {t("pageContent.default")}: {defaults[entry.key]}
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
