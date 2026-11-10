"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "../Moderation/StatusBadge.jsx";
import EntryForm from "../Contribute/EntryForm.jsx";
import "./Review.css";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function titleFor(kind, entry) {
  return kind === "word" ? entry.word : entry.name;
}

function detailFor(kind, entry) {
  if (kind === "word") {
    return [
      entry.translation,
      entry.languageName ? `in ${entry.languageName}` : null,
      entry.partOfSpeech,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return [entry.autonym, entry.region, `${Number(entry.speakers).toLocaleString()} speakers`]
    .filter(Boolean)
    .join(" · ");
}

function ContentCard({ kind, entry, roleKey, comment, onComment, onReview, onEdit, busy }) {
  const key = `${kind}:${entry.id}`;
  const isAdmin = roleKey === "admin";
  const approveLabel = isAdmin ? "Final approve" : "Recommend approval";

  return (
    <article className="roleCard">
      <div className="roleCard__head">
        <h3 className="roleCard__title">{titleFor(kind, entry)}</h3>
        <StatusBadge state={entry.reviewState} />
      </div>

      <p className="roleCard__subtitle">{detailFor(kind, entry)}</p>

      <div className="roleCard__meta">
        <span>{kind === "word" ? "Word" : "Language"}</span>
        <span>Created {formatDate(entry.createdAt)}</span>
        {entry.reviewedAt ? <span>Reviewed {formatDate(entry.reviewedAt)}</span> : null}
      </div>

      {entry.usage ? <p className="roleCard__body">{entry.usage}</p> : null}

      {entry.removalRequestedAt ? (
        <p className="roleCard__note">
          A removal request is open for this entry
          {entry.removalRequestReason ? ` — ${entry.removalRequestReason}` : ""}
        </p>
      ) : null}

      <div className="review__comment">
        <label className="roleLabel" htmlFor={`comment-${key}`}>
          Reviewer note (optional for approval, useful for a rejection)
        </label>
        <Textarea
          id={`comment-${key}`}
          className="roleTextarea"
          value={comment}
          onChange={(event) => onComment(key, event.target.value)}
          placeholder="Say what is correct, or what the contributor should change."
        />
      </div>

      <div className="roleActions">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => onReview(kind, entry, "approve")}
        >
          {busy ? "Saving…" : approveLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => onReview(kind, entry, "reject")}
          className="border-border text-foreground hover:bg-accent"
        >
          Reject
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => onEdit(kind, entry)}
        >
          Edit entry
        </Button>
        {!isAdmin ? (
          <span className="roleHint">
            Your approval is a recommendation; an admin still makes the final call.
          </span>
        ) : null}
      </div>
    </article>
  );
}

function RemovalCard({ kind, entry, roleKey, busy, onApprove, onDismiss }) {
  const isAdmin = roleKey === "admin";

  return (
    <article className="roleCard roleCard--request">
      <div className="roleCard__head">
        <h3 className="roleCard__title">Remove: {titleFor(kind, entry)}</h3>
        <StatusBadge state="pending" label="Removal requested" />
      </div>

      <p className="roleCard__subtitle">{detailFor(kind, entry)}</p>

      <div className="roleCard__meta">
        <span>{kind === "word" ? "Word" : "Language"}</span>
        <span>Requested {formatDate(entry.removalRequestedAt)}</span>
      </div>

      {entry.removalRequestReason ? (
        <p className="roleCard__body">Reason: {entry.removalRequestReason}</p>
      ) : null}

      <div className="roleActions">
        {isAdmin ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onApprove(kind, entry)}
              className="border-border text-foreground hover:bg-accent"
            >
              {busy ? "Removing…" : "Approve removal"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => onDismiss(kind, entry)}
            >
              Reject request
            </Button>
            <span className="roleHint">
              Approving is a logical delete; the entry moves to the admin archive.
            </span>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onDismiss(kind, entry)}
          >
            Withdraw request
          </Button>
        )}
      </div>
    </article>
  );
}

/**
 * Review desk. Reviewers recommend approval or rejection; admins make the
 * final call and decide removal requests. The queue response groups words,
 * languages and open removal requests.
 */
export default function ReviewDashboard({ user }) {
  const [queue, setQueue] = useState({
    words: [],
    languages: [],
    removalRequests: { words: [], languages: [] },
  });
  const [comments, setComments] = useState({});
  const [languages, setLanguages] = useState([]);
  const [editor, setEditor] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    try {
      const [response, languageResponse] = await Promise.all([
        apiFetch("/reviews/queue?type=all&limit=100"),
        apiFetch("/languages?limit=100"),
      ]);
      setQueue({
        words: response?.data?.words ?? [],
        languages: response?.data?.languages ?? [],
        removalRequests: {
          words: response?.data?.removalRequests?.words ?? [],
          languages: response?.data?.removalRequests?.languages ?? [],
        },
      });
      setLanguages(languageResponse?.data ?? []);
      setError(null);
    } catch (cause) {
      setError(cause?.message ?? "Could not load the review queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; updates happen after the awaited API call
    load();
  }, [load]);

  const contentCount = queue.words.length + queue.languages.length;
  const removalCount =
    queue.removalRequests.words.length + queue.removalRequests.languages.length;

  const editorLanguages = useMemo(() => {
    if (!editor || editor.kind !== "word") return languages;
    const entry = editor.entry;
    if (!entry?.languageId || languages.some((language) => language.id === entry.languageId)) {
      return languages;
    }
    return [
      ...languages,
      {
        id: entry.languageId,
        name: entry.languageName ?? entry.languageId,
        autonym: "",
      },
    ];
  }, [editor, languages]);

  const setComment = (key, value) => {
    setComments((current) => ({ ...current, [key]: value }));
  };

  const review = async (kind, entry, decision) => {
    const key = `${kind}:${entry.id}`;
    setBusyKey(key);
    setError(null);
    setNotice(null);

    try {
      const base = kind === "word" ? "/words" : "/languages";
      await apiFetch(`${base}/${encodeURIComponent(entry.id)}/review`, {
        method: "POST",
        body: { decision, comment: comments[key] ?? "" },
      });

      setNotice(
        decision === "approve"
          ? user.roleKey === "admin"
            ? "Final approval saved. The entry is published."
            : "Recommendation saved. An admin still needs to give the final approval."
          : "Entry rejected and returned to its author.",
      );
      setComments((current) => ({ ...current, [key]: "" }));
      await load();
    } catch (cause) {
      setError(cause?.message ?? "Could not save that review.");
    } finally {
      setBusyKey(null);
    }
  };

  const approveRemoval = async (kind, entry) => {
    const ok = window.confirm(
      `Remove "${titleFor(kind, entry)}" logically? It will move to the admin archive and can be restored later.`,
    );
    if (!ok) return;

    const key = `${kind}:${entry.id}`;
    setBusyKey(key);
    setError(null);
    setNotice(null);

    try {
      const base = kind === "word" ? "/words" : "/languages";
      await apiFetch(`${base}/${encodeURIComponent(entry.id)}`, {
        method: "DELETE",
        body: {
          reason:
            entry.removalRequestReason || "Removal approved by an administrator.",
        },
      });
      setNotice("Entry removed logically and kept in the admin archive.");
      await load();
    } catch (cause) {
      setError(cause?.message ?? "Could not remove that entry.");
    } finally {
      setBusyKey(null);
    }
  };

  const dismissRemoval = async (kind, entry) => {
    const key = `${kind}:${entry.id}`;
    setBusyKey(key);
    setError(null);
    setNotice(null);

    try {
      const base = kind === "word" ? "/words" : "/languages";
      await apiFetch(`${base}/${encodeURIComponent(entry.id)}/removal-request`, {
        method: "DELETE",
      });
      setNotice(
        user.roleKey === "admin"
          ? "Removal request rejected. The entry stays as it is."
          : "Removal request withdrawn.",
      );
      await load();
    } catch (cause) {
      setError(cause?.message ?? "Could not clear that removal request.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaved = async (_data, kind, isEdit) => {
    setEditor(null);
    setNotice(
      `${kind === "word" ? "Word" : "Language"} ${
        isEdit ? "updated" : "saved"
      }. ${
        user.roleKey === "admin"
          ? "The current review state was kept."
          : "It is now marked as reviewer approved and still needs an admin's final approval."
      }`,
    );
    await load();
  };

  return (
    <div>
      <div className="roleTabs" role="tablist" aria-label="Review summary">
        <span className="roleTab is-active">
          Queue <span className="roleTab__count">{contentCount}</span>
        </span>
        <span className="roleTab">
          Removal requests <span className="roleTab__count">{removalCount}</span>
        </span>
      </div>

      <p className="roleNotice roleNotice--info">
        {user.roleKey === "admin"
          ? "You have the final say: approvals publish immediately, and removal requests become archive entries."
          : "You can recommend approval, reject entries, and raise or withdraw removal requests. An admin makes the final decision."}
      </p>

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

      {editor ? (
        <EntryForm
          key={`${editor.kind}-${editor.entry.id}`}
          kind={editor.kind}
          entry={editor.entry}
          languages={editorLanguages}
          roleKey={user.roleKey}
          onCancel={() => setEditor(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {loading ? (
        <div className="roleEmpty">Loading the review queue…</div>
      ) : contentCount === 0 && removalCount === 0 ? (
        <div className="roleEmpty">
          The queue is clear. New submissions will appear here after contributors
          send them for review.
        </div>
      ) : (
        <>
          {queue.languages.length > 0 ? (
            <section className="roleSection">
              <div className="roleSection__head">
                <h2 className="roleSection__title">Languages waiting</h2>
                <span className="roleSection__hint">{queue.languages.length}</span>
              </div>
              <div className="roleList">
                {queue.languages.map((entry) => (
                  <ContentCard
                    key={entry.id}
                    kind="language"
                    entry={entry}
                    roleKey={user.roleKey}
                    comment={comments[`language:${entry.id}`] ?? ""}
                    onComment={setComment}
                    onReview={review}
                    onEdit={(kind, value) => setEditor({ kind, entry: value })}
                    busy={busyKey === `language:${entry.id}`}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {queue.words.length > 0 ? (
            <section className="roleSection">
              <div className="roleSection__head">
                <h2 className="roleSection__title">Words waiting</h2>
                <span className="roleSection__hint">{queue.words.length}</span>
              </div>
              <div className="roleList">
                {queue.words.map((entry) => (
                  <ContentCard
                    key={entry.id}
                    kind="word"
                    entry={entry}
                    roleKey={user.roleKey}
                    comment={comments[`word:${entry.id}`] ?? ""}
                    onComment={setComment}
                    onReview={review}
                    onEdit={(kind, value) => setEditor({ kind, entry: value })}
                    busy={busyKey === `word:${entry.id}`}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {removalCount > 0 ? (
            <section className="roleSection">
              <div className="roleSection__head">
                <h2 className="roleSection__title">Removal requests</h2>
                <span className="roleSection__hint">{removalCount}</span>
              </div>
              <div className="roleList">
                {queue.removalRequests.languages.map((entry) => (
                  <RemovalCard
                    key={`language-${entry.id}`}
                    kind="language"
                    entry={entry}
                    roleKey={user.roleKey}
                    busy={busyKey === `language:${entry.id}`}
                    onApprove={approveRemoval}
                    onDismiss={dismissRemoval}
                  />
                ))}
                {queue.removalRequests.words.map((entry) => (
                  <RemovalCard
                    key={`word-${entry.id}`}
                    kind="word"
                    entry={entry}
                    roleKey={user.roleKey}
                    busy={busyKey === `word:${entry.id}`}
                    onApprove={approveRemoval}
                    onDismiss={dismissRemoval}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
