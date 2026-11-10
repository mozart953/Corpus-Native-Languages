"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from "../Moderation/StatusBadge.jsx";
import EntryForm from "./EntryForm.jsx";
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
  const isDraft = entry.reviewState === "draft";
  const isTrash = mode === "trash";
  const title = kind === "word" ? entry.word : entry.name;
  const subtitle =
    kind === "word"
      ? entry.translation
      : `${entry.autonym} · ${entry.region}`;

  return (
    <article className={`roleCard ${isTrash ? "roleCard--removed" : ""}`}>
      <div className="roleCard__head">
        <h3 className="roleCard__title">{title}</h3>
        {isTrash ? (
          <StatusBadge state="removed" label="In trash" />
        ) : (
          <StatusBadge state={entry.reviewState} />
        )}
      </div>

      <p className="roleCard__subtitle">{subtitle}</p>

      <div className="roleCard__meta">
        <span>{kind === "word" ? "Word" : "Language"}</span>
        {kind === "word" && entry.languageName ? (
          <span>in {entry.languageName}</span>
        ) : null}
        {kind === "language" ? (
          <span>
            {Number(entry.speakers).toLocaleString()} speakers · {entry.status}
          </span>
        ) : null}
        <span>Updated {formatDate(entry.updatedAt)}</span>
        {entry.partOfSpeech ? <span>{entry.partOfSpeech}</span> : null}
      </div>

      {entry.rejectionReason ? (
        <p className="roleCard__note roleCard__note--danger">
          Rejected: {entry.rejectionReason}
        </p>
      ) : null}

      {entry.removalRequestedAt ? (
        <p className="roleCard__note">
          Removal requested {formatDate(entry.removalRequestedAt)}
          {entry.removalRequestReason ? ` — ${entry.removalRequestReason}` : ""}
        </p>
      ) : null}

      {isTrash && entry.deletionReason ? (
        <p className="roleCard__note roleCard__note--danger">
          Discarded: {entry.deletionReason}
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
            {busy ? "Restoring…" : "Restore draft"}
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
              Edit
            </Button>

            {isDraft ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onSubmit(kind, entry)}
                  disabled={busy}
                >
                  {busy ? "Submitting…" : "Submit for review"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(kind, entry)}
                  disabled={busy}
                  className="border-border text-foreground hover:bg-accent"
                >
                  Delete draft
                </Button>
              </>
            ) : (
              <span className="roleHint">
                Submitted entries can only be removed through the review desk.
              </span>
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
      setError(cause?.message ?? "Could not load your contributions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; updates happen after the awaited API call
    load();
  }, [load]);

  const entryCount = entries.words.length + entries.languages.length;
  const trashCount = trash.words.length + trash.languages.length;

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
      setError(cause?.message ?? "Could not complete that action.");
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmit = (kind, entry) => {
    runAction(
      kind,
      entry,
      "submit",
      `${kind === "word" ? "Word" : "Language"} submitted for review.`,
    );
  };

  const handleDelete = (kind, entry) => {
    const ok = window.confirm(
      "Move this draft to your private trash? You can restore it any time.",
    );
    if (!ok) return;
    runAction(
      kind,
      entry,
      "delete",
      "Draft moved to your private trash. You can restore it any time.",
    );
  };

  const handleRestore = (kind, entry) => {
    runAction(
      kind,
      entry,
      "restore",
      `${kind === "word" ? "Word" : "Language"} restored as a draft.`,
    );
  };

  const handleSaved = async (_data, kind, isEdit) => {
    setEditor(null);
    setNotice(
      `${kind === "word" ? "Word" : "Language"} ${
        isEdit ? "updated" : "saved as a draft"
      }.`,
    );
    await load();
  };

  const roleHint =
    user.roleKey === "admin"
      ? "Admin saves publish immediately."
      : user.roleKey === "reviewer"
        ? "Reviewer saves still need an admin's final approval before they publish."
        : "Your drafts stay private until you submit them for review.";

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-0">
      <TabsList className="roleTabs" aria-label="Contribution views">
        <TabsTrigger
          value="entries"
          className={`roleTab ${tab === "entries" ? "is-active" : ""}`}
        >
          My contributions <span className="roleTab__count">{entryCount}</span>
        </TabsTrigger>
        <TabsTrigger
          value="trash"
          className={`roleTab ${tab === "trash" ? "is-active" : ""}`}
        >
          Private trash <span className="roleTab__count">{trashCount}</span>
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
              New word
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditor({ kind: "language", entry: null })}
            >
              New language
            </Button>
          </div>
          <span className="roleHint">
            {languages.length} language{languages.length === 1 ? "" : "s"} available
            for words
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
        <div className="roleEmpty">Loading your contributions…</div>
      ) : tab === "entries" ? (
        entryCount === 0 ? (
          <div className="roleEmpty">
            Nothing here yet. Create a language first if you are starting from
            scratch, then add words to it.
          </div>
        ) : (
          <>
            {entries.languages.length > 0 ? (
              <section className="roleSection">
                <div className="roleSection__head">
                  <h2 className="roleSection__title">Languages</h2>
                  <span className="roleSection__hint">
                    {entries.languages.length} entr
                    {entries.languages.length === 1 ? "y" : "ies"}
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
                  <h2 className="roleSection__title">Words</h2>
                  <span className="roleSection__hint">
                    {entries.words.length} entr
                    {entries.words.length === 1 ? "y" : "ies"}
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
        <div className="roleEmpty">
          Your private trash is empty. Deleting a draft moves it here instead of
          destroying it.
        </div>
      ) : (
        <>
          {trash.languages.length > 0 ? (
            <section className="roleSection">
              <div className="roleSection__head">
                <h2 className="roleSection__title">Trashed languages</h2>
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
                <h2 className="roleSection__title">Trashed words</h2>
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
