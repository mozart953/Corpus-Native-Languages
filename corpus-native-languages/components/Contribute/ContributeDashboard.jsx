"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from "../Moderation/StatusBadge.jsx";
import EntryForm from "./EntryForm.jsx";
import { useI18n } from "../../lib/i18n";
import "./Contribute.css";

function mergeLanguages(...groups) {
  const byId = new Map();
  for (const group of groups) {
    for (const language of group ?? []) {
      if (language?.id && !byId.has(language.id)) byId.set(language.id, language);
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function EntryCard({
  kind,
  entry,
  mode,
  busy,
  onEdit,
  onSubmit,
  onDelete,
  onRestore,
}) {
  const { t, has } = useI18n();
  const isDraft = entry.reviewState === "draft";
  const isTrash = mode === "trash";
  const title = kind === "word" ? entry.word : entry.name;
  const subtitle =
    kind === "word"
      ? entry.translation
      : `${entry.autonym} · ${entry.region}`;
  const kindLabel = t(
    kind === "word" ? "contribute.card.word" : "contribute.card.language",
  );
  const statusKey = `languageCard.status.${entry.status}`;

  return (
    <article className={`roleCard ${isTrash ? "roleCard--removed" : ""}`}>
      <div className="roleCard__head">
        <h3 className="roleCard__title">{title}</h3>
        {isTrash ? (
          <StatusBadge state="removed" label={t("contribute.card.inTrash")} />
        ) : (
          <StatusBadge state={entry.reviewState} />
        )}
      </div>

      <p className="roleCard__subtitle">{subtitle}</p>

      <div className="roleCard__meta">
        <span>{kindLabel}</span>
        {kind === "word" && entry.languageName ? (
          <span>{t("common.inLanguage", { language: entry.languageName })}</span>
        ) : null}
        {kind === "language" ? (
          <span>
            {t("contribute.card.speakersStatus", {
              count: Number(entry.speakers).toLocaleString(),
              status: has(statusKey) ? t(statusKey) : entry.status,
            })}
          </span>
        ) : null}
        <span>{t("contribute.card.updated", { date: formatDate(entry.updatedAt) })}</span>
        {entry.partOfSpeech ? <span>{entry.partOfSpeech}</span> : null}
      </div>

      {entry.rejectionReason ? (
        <p className="roleCard__note roleCard__note--danger">
          {t("contribute.card.rejected", { reason: entry.rejectionReason })}
        </p>
      ) : null}

      {entry.removalRequestedAt ? (
        <p className="roleCard__note">
          {t("contribute.card.removalRequested", {
            date: formatDate(entry.removalRequestedAt),
          })}
          {entry.removalRequestReason ? ` — ${entry.removalRequestReason}` : ""}
        </p>
      ) : null}

      {isTrash && entry.deletionReason ? (
        <p className="roleCard__note roleCard__note--danger">
          {t("contribute.card.discarded", { reason: entry.deletionReason })}
        </p>
      ) : null}

      <div className="roleActions">
        {isTrash ? (
          <Button
            type="button"
            size="sm"
            onClick={() => onRestore(kind, entry)}
            disabled={busy}
          >
            {busy
              ? t("contribute.card.restoring")
              : t("contribute.card.restoreDraft")}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit(kind, entry)}
              disabled={busy}
            >
              {t("contribute.card.edit")}
            </Button>

            {isDraft ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onSubmit(kind, entry)}
                  disabled={busy}
                >
                  {busy
                    ? t("contribute.card.submitting")
                    : t("contribute.card.submit")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(kind, entry)}
                  disabled={busy}
                  className="border-border text-foreground hover:bg-accent"
                >
                  {t("contribute.card.deleteDraft")}
                </Button>
              </>
            ) : (
              <span className="roleHint">{t("contribute.card.submittedHint")}</span>
            )}
          </>
        )}
      </div>
    </article>
  );
}

/**
 * Contributor workbench: private drafts, a restorable trash, and submission to
 * the reviewer queue. Reviewers and admins can use the same form; their saves
 * enter the workflow at different stages, which the API decides.
 */
export default function ContributeDashboard({ user }) {
  const [tab, setTab] = useState("entries");
  const [entries, setEntries] = useState({ words: [], languages: [] });
  const [trash, setTrash] = useState({ words: [], languages: [] });
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [editor, setEditor] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const { t } = useI18n();

  const load = useCallback(async () => {
    try {
      const [
        mineWords,
        mineLanguages,
        trashWords,
        trashLanguages,
        publicLanguages,
      ] = await Promise.all([
        apiFetch("/words/mine?limit=100"),
        apiFetch("/languages/mine?limit=100"),
        apiFetch("/words/trash?limit=100"),
        apiFetch("/languages/trash?limit=100"),
        apiFetch("/languages?limit=100"),
      ]);

      setEntries({
        words: mineWords?.data ?? [],
        languages: mineLanguages?.data ?? [],
      });
      setTrash({
        words: trashWords?.data ?? [],
        languages: trashLanguages?.data ?? [],
      });
      setLanguages(
        mergeLanguages(publicLanguages?.data, mineLanguages?.data),
      );
      setError(null);
    } catch (cause) {
      setError(cause?.message ?? t("contribute.loading"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; updates happen after the awaited API call
    load();
  }, [load]);

  const entryCount = entries.words.length + entries.languages.length;
  const trashCount = trash.words.length + trash.languages.length;

  const kindLabel = (kind) =>
    t(kind === "word" ? "contribute.card.word" : "contribute.card.language");

  const runAction = async (kind, entry, action, message) => {
    setBusyId(entry.id);
    setError(null);
    setNotice(null);

    try {
      const base = kind === "word" ? "/words" : "/languages";
      const id = encodeURIComponent(entry.id);

      if (action === "submit") {
        await apiFetch(`${base}/${id}/submit`, { method: "POST" });
      } else if (action === "delete") {
        await apiFetch(`${base}/${id}`, {
          method: "DELETE",
          body: { reason: "Discarded by its author before submission." },
        });
      } else if (action === "restore") {
        await apiFetch(`${base}/${id}/restore`, { method: "POST" });
      }

      setNotice(message);
      await load();
    } catch (cause) {
      setError(cause?.message ?? t("form.error.save"));
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmit = (kind, entry) => {
    runAction(
      kind,
      entry,
      "submit",
      t("contribute.notice.submitted", { kind: kindLabel(kind) }),
    );
  };

  const handleDelete = (kind, entry) => {
    const ok = window.confirm(t("contribute.confirmDelete"));
    if (!ok) return;
    runAction(kind, entry, "delete", t("contribute.notice.deleted"));
  };

  const handleRestore = (kind, entry) => {
    runAction(
      kind,
      entry,
      "restore",
      t("contribute.notice.restored", { kind: kindLabel(kind) }),
    );
  };

  const handleSaved = async (_data, kind, isEdit) => {
    setEditor(null);
    setNotice(
      t(isEdit ? "contribute.notice.updated" : "contribute.notice.savedDraft", {
        kind: kindLabel(kind),
      }),
    );
    await load();
  };

  const roleHint =
    user.roleKey === "admin"
      ? t("contribute.hint.admin")
      : user.roleKey === "reviewer"
        ? t("contribute.hint.reviewer")
        : t("contribute.hint.contributor");

  const entryUnit = (count) =>
    `${count} ${t(count === 1 ? "common.entry" : "common.entries")}`;

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-0">
      <TabsList className="roleTabs" aria-label={t("contribute.title")}>
        <TabsTrigger
          value="entries"
          className={`roleTab ${tab === "entries" ? "is-active" : ""}`}
        >
          {t("contribute.tab.entries")}{" "}
          <span className="roleTab__count">{entryCount}</span>
        </TabsTrigger>
        <TabsTrigger
          value="trash"
          className={`roleTab ${tab === "trash" ? "is-active" : ""}`}
        >
          {t("contribute.tab.trash")}{" "}
          <span className="roleTab__count">{trashCount}</span>
        </TabsTrigger>
      </TabsList>

      <p className="roleNotice roleNotice--info">{roleHint}</p>

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

      {tab === "entries" ? (
          <div className="roleToolbar">
          <div className="roleToolbar__group">
            <Button
              type="button"
              onClick={() => setEditor({ kind: "word", entry: null })}
            >
              {t("contribute.newWord")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditor({ kind: "language", entry: null })}
            >
              {t("contribute.newLanguage")}
            </Button>
          </div>
          <span className="roleHint">
            {t("contribute.languagesAvailable", { count: languages.length })}
          </span>
        </div>
      ) : null}

      {editor ? (
        <EntryForm
          key={`${editor.kind}-${editor.entry?.id ?? "new"}`}
          kind={editor.kind}
          entry={editor.entry}
          languages={languages}
          roleKey={user.roleKey}
          onCancel={() => setEditor(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {loading ? (
        <div className="roleEmpty">{t("contribute.loading")}</div>
      ) : tab === "entries" ? (
        entryCount === 0 ? (
          <div className="roleEmpty">{t("contribute.empty")}</div>
        ) : (
          <>
            {entries.languages.length > 0 ? (
              <section className="roleSection">
                <div className="roleSection__head">
                  <h2 className="roleSection__title">{t("contribute.section.languages")}</h2>
                  <span className="roleSection__hint">
                    {entryUnit(entries.languages.length)}
                  </span>
                </div>
                <div className="roleList">
                  {entries.languages.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      kind="language"
                      entry={entry}
                      mode="entries"
                      busy={busyId === entry.id}
                      onEdit={(kind, value) => setEditor({ kind, entry: value })}
                      onSubmit={handleSubmit}
                      onDelete={handleDelete}
                      onRestore={handleRestore}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {entries.words.length > 0 ? (
              <section className="roleSection">
                <div className="roleSection__head">
                  <h2 className="roleSection__title">{t("contribute.section.words")}</h2>
                  <span className="roleSection__hint">
                    {entryUnit(entries.words.length)}
                  </span>
                </div>
                <div className="roleList">
                  {entries.words.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      kind="word"
                      entry={entry}
                      mode="entries"
                      busy={busyId === entry.id}
                      onEdit={(kind, value) => setEditor({ kind, entry: value })}
                      onSubmit={handleSubmit}
                      onDelete={handleDelete}
                      onRestore={handleRestore}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )
      ) : trashCount === 0 ? (
        <div className="roleEmpty">{t("contribute.trashEmpty")}</div>
      ) : (
        <>
          {trash.languages.length > 0 ? (
            <section className="roleSection">
              <div className="roleSection__head">
                <h2 className="roleSection__title">
                  {t("contribute.section.trashedLanguages")}
                </h2>
              </div>
              <div className="roleList">
                {trash.languages.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    kind="language"
                    entry={entry}
                    mode="trash"
                    busy={busyId === entry.id}
                    onEdit={() => {}}
                    onSubmit={handleSubmit}
                    onDelete={handleDelete}
                    onRestore={handleRestore}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {trash.words.length > 0 ? (
            <section className="roleSection">
              <div className="roleSection__head">
                <h2 className="roleSection__title">
                  {t("contribute.section.trashedWords")}
                </h2>
              </div>
              <div className="roleList">
                {trash.words.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    kind="word"
                    entry={entry}
                    mode="trash"
                    busy={busyId === entry.id}
                    onEdit={() => {}}
                    onSubmit={handleSubmit}
                    onDelete={handleDelete}
                    onRestore={handleRestore}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </Tabs>
  );
}
