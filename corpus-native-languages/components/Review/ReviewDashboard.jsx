"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "../Moderation/StatusBadge.jsx";
import EntryForm from "../Contribute/EntryForm.jsx";
import { useI18n } from "../../lib/i18n";
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

function detailFor(kind, entry, t) {
  if (kind === "word") {
    return [
      entry.translation,
      entry.languageName
        ? t("common.inLanguage", { language: entry.languageName })
        : null,
      entry.partOfSpeech,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return [
    entry.autonym,
    entry.region,
    t("common.speakersCount", {
      count: Number(entry.speakers).toLocaleString(),
    }),
  ]
    .filter(Boolean)
    .join(" · ");
}

function ContentCard({ kind, entry, roleKey, comment, onComment, onReview, onEdit, busy }) {
  const { t } = useI18n();
  const key = `${kind}:${entry.id}`;
  const isAdmin = roleKey === "admin";
  const approveLabel = isAdmin
    ? t("review.card.finalApprove")
    : t("review.card.recommend");

  return (
    <article className="roleCard">
      <div className="roleCard__head">
        <h3 className="roleCard__title">{titleFor(kind, entry)}</h3>
        <StatusBadge state={entry.reviewState} />
      </div>

      <p className="roleCard__subtitle">{detailFor(kind, entry, t)}</p>

      <div className="roleCard__meta">
        <span>
          {t(kind === "word" ? "review.card.word" : "review.card.language")}
        </span>
        <span>{t("review.card.created", { date: formatDate(entry.createdAt) })}</span>
        {entry.reviewedAt ? (
          <span>{t("review.card.reviewed", { date: formatDate(entry.reviewedAt) })}</span>
        ) : null}
      </div>

      {entry.usage ? <p className="roleCard__body">{entry.usage}</p> : null}

      {entry.removalRequestedAt ? (
        <p className="roleCard__note">
          {t("review.card.removalOpen")}
          {entry.removalRequestReason ? ` — ${entry.removalRequestReason}` : ""}
        </p>
      ) : null}

      <div className="review__comment">
        <label className="roleLabel" htmlFor={`comment-${key}`}>
          {t("review.card.noteLabel")}
        </label>
        <Textarea
          id={`comment-${key}`}
          className="roleTextarea"
          value={comment}
          onChange={(event) => onComment(key, event.target.value)}
          placeholder={t("review.card.notePlaceholder")}
        />
      </div>

      <div className="roleActions">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => onReview(kind, entry, "approve")}
        >
          {busy ? t("review.card.saving") : approveLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => onReview(kind, entry, "reject")}
          className="border-border text-foreground hover:bg-accent"
        >
          {t("review.card.reject")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => onEdit(kind, entry)}
        >
          {t("review.card.edit")}
        </Button>
        {!isAdmin ? (
          <span className="roleHint">{t("review.card.recommendHint")}</span>
        ) : null}
      </div>
    </article>
  );
}

function RemovalCard({ kind, entry, roleKey, busy, onApprove, onDismiss }) {
  const { t } = useI18n();
  const isAdmin = roleKey === "admin";

  return (
    <article className="roleCard roleCard--request">
      <div className="roleCard__head">
        <h3 className="roleCard__title">
          {t("review.card.removeTitle", { title: titleFor(kind, entry) })}
        </h3>
        <StatusBadge state="pending" label={t("review.card.removalRequested")} />
      </div>

      <p className="roleCard__subtitle">{detailFor(kind, entry, t)}</p>

      <div className="roleCard__meta">
        <span>
          {t(kind === "word" ? "review.card.word" : "review.card.language")}
        </span>
        <span>
          {t("review.card.requested", {
            date: formatDate(entry.removalRequestedAt),
          })}
        </span>
      </div>

      {entry.removalRequestReason ? (
        <p className="roleCard__body">
          {t("review.card.reason", { reason: entry.removalRequestReason })}
        </p>
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
              {busy ? t("review.card.removing") : t("review.card.approveRemoval")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => onDismiss(kind, entry)}
            >
              {t("review.card.rejectRequest")}
            </Button>
            <span className="roleHint">{t("review.card.approveRemovalHint")}</span>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onDismiss(kind, entry)}
          >
            {t("review.card.withdraw")}
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
  const { t } = useI18n();
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
      setError(cause?.message ?? t("review.error.load"));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
            ? t("review.notice.final")
            : t("review.notice.recommend")
          : t("review.notice.rejected"),
      );
      setComments((current) => ({ ...current, [key]: "" }));
      await load();
    } catch (cause) {
      setError(cause?.message ?? t("review.error.save"));
    } finally {
      setBusyKey(null);
    }
  };

  const approveRemoval = async (kind, entry) => {
    const ok = window.confirm(
      t("review.confirmRemove", { title: titleFor(kind, entry) }),
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
            entry.removalRequestReason ||
            "Removal approved by an administrator.",
        },
      });
      setNotice(t("review.notice.removed"));
      await load();
    } catch (cause) {
      setError(cause?.message ?? t("review.error.remove"));
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
          ? t("review.notice.requestRejected")
          : t("review.notice.withdrawn"),
      );
      await load();
    } catch (cause) {
      setError(cause?.message ?? t("review.error.clear"));
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaved = async (_data, kind, isEdit) => {
    setEditor(null);
    const kindLabel = t(
      kind === "word" ? "review.card.word" : "review.card.language",
    );
    const action = t(isEdit ? "common.updated" : "common.saved");
    const suffix =
      user.roleKey === "admin"
        ? t("review.notice.savedAdmin")
        : t("review.notice.savedReviewer");

    setNotice(`${t("review.notice.saved", { kind: kindLabel, action })} ${suffix}`);
    await load();
  };

  return (
    <div>
      <div className="roleTabs" role="tablist" aria-label={t("review.summary")}>
        <span className="roleTab is-active">
          {t("review.queue")}{" "}
          <span className="roleTab__count">{contentCount}</span>
        </span>
        <span className="roleTab">
          {t("review.removalRequests")}{" "}
          <span className="roleTab__count">{removalCount}</span>
        </span>
      </div>

      <p className="roleNotice roleNotice--info">
        {t(user.roleKey === "admin" ? "review.hint.admin" : "review.hint.reviewer")}
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
        <div className="roleEmpty">{t("review.loading")}</div>
      ) : contentCount === 0 && removalCount === 0 ? (
        <div className="roleEmpty">{t("review.empty")}</div>
      ) : (
        <>
          {queue.languages.length > 0 ? (
            <section className="roleSection">
              <div className="roleSection__head">
                <h2 className="roleSection__title">{t("review.section.languages")}</h2>
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
                <h2 className="roleSection__title">{t("review.section.words")}</h2>
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
                <h2 className="roleSection__title">{t("review.section.removals")}</h2>
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
