"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from "../Moderation/StatusBadge.jsx";
import EntryForm from "../Contribute/EntryForm.jsx";
import SiteImageManager from "./SiteImageManager.jsx";
import PageContentManager from "./PageContentManager.jsx";
import { useI18n } from "../../lib/i18n";
import "./Admin.css";

const STATUS_FILTERS = [
  { value: "all", labelKey: "admin.accounts.allStatuses" },
  { value: "pending", labelKey: "admin.accounts.pending" },
  { value: "active", labelKey: "admin.accounts.active" },
  { value: "rejected", labelKey: "admin.accounts.rejected" },
  { value: "deactivated", labelKey: "admin.accounts.deactivated" },
];

const ROLE_FILTERS = [
  { value: "all", labelKey: "admin.accounts.allRoles" },
  { value: "contributor", labelKey: "admin.accounts.contributors" },
  { value: "reviewer", labelKey: "admin.accounts.reviewers" },
  { value: "admin", labelKey: "admin.accounts.admins" },
];

const APPROVAL_ROLES = [
  { value: "contributor", labelKey: "admin.accounts.contributor" },
  { value: "reviewer", labelKey: "admin.accounts.reviewer" },
];

const ACTIVE_ROLES = [
  { value: "contributor", labelKey: "admin.accounts.contributor" },
  { value: "reviewer", labelKey: "admin.accounts.reviewer" },
  { value: "admin", labelKey: "admin.accounts.admin" },
];

const STATUS_ORDER = {
  pending: 0,
  rejected: 1,
  deactivated: 2,
  active: 3,
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function AccountCard({
  account,
  isSelf,
  approvalRole,
  roleDraft,
  busy,
  onApprovalRole,
  onRoleDraft,
  onApprove,
  onReject,
  onSaveRole,
  onDeactivate,
  onReactivate,
}) {
  const canApprove = account.status === "pending" || account.status === "rejected";
  const isActive = account.status === "active";
  const isDeactivated = account.status === "deactivated";
  const { t } = useI18n();

  return (
    <article className={`roleCard adminAccount ${isSelf ? "adminAccount--self" : ""}`}>
      <div className="roleCard__head">
        <div className="adminAccount__identity">
          <h3 className="roleCard__title">{account.username}</h3>
          <span className="roleCard__subtitle">{account.email}</span>
        </div>
        <StatusBadge state={account.status} />
      </div>

      <div className="roleCard__meta">
        <span>{account.role}</span>
        <span>{t("admin.accounts.joined", { date: formatDate(account.createdAt) })}</span>
        <span>
          {account.lastLoginAt
            ? t("admin.accounts.lastSignIn", { date: formatDate(account.lastLoginAt) })
            : t("admin.accounts.never")}
        </span>
        {isSelf ? <span>{t("admin.accounts.thisIsYou")}</span> : null}
      </div>

      {account.statusReason ? (
        <p className="roleCard__note roleCard__note--danger">
          {account.statusReason}
        </p>
      ) : null}

      {canApprove ? (
        <div className="adminAccount__actions">
          <label className="roleField adminAccount__roleField">
            <span className="roleLabel">{t("admin.accounts.approveAs")}</span>
            <select
              className="roleSelect"
              value={approvalRole}
              onChange={(event) => onApprovalRole(account.id, event.target.value)}
              disabled={busy}
            >
              {APPROVAL_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {t(role.labelKey)}
                </option>
              ))}
            </select>
          </label>
          <div className="roleActions adminAccount__buttons">
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => onApprove(account)}
            >
              {busy ? t("admin.accounts.saving") : t("admin.accounts.approve")}
            </Button>
            {account.status === "pending" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => onReject(account)}
                className="border-border text-foreground hover:bg-accent"
              >
                {t("admin.accounts.reject")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {isActive ? (
        <div className="adminAccount__actions">
          <label className="roleField adminAccount__roleField">
            <span className="roleLabel">{t("admin.accounts.roleLabel")}</span>
            <select
              className="roleSelect"
              value={roleDraft}
              onChange={(event) => onRoleDraft(account.id, event.target.value)}
              disabled={busy || isSelf}
            >
              {ACTIVE_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {t(role.labelKey)}
                </option>
              ))}
            </select>
          </label>
          <div className="roleActions adminAccount__buttons">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || isSelf || roleDraft === account.role}
              onClick={() => onSaveRole(account)}
            >
              {t("admin.accounts.saveRole")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || isSelf}
              onClick={() => onDeactivate(account)}
              className="border-border text-foreground hover:bg-accent"
            >
              {t("admin.accounts.deactivate")}
            </Button>
          </div>
          {isSelf ? (
            <p className="roleHint adminAccount__hint">
              {t("admin.accounts.selfHint")}
            </p>
          ) : null}
        </div>
      ) : null}

      {isDeactivated ? (
        <div className="roleActions adminAccount__buttons">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => onReactivate(account)}
          >
            {busy ? t("admin.accounts.saving") : t("admin.accounts.reactivate")}
          </Button>
          <span className="roleHint">
            {t("admin.accounts.reactivateHint", { role: account.role })}
          </span>
        </div>
      ) : null}
    </article>
  );
}

function ContentCard({ kind, entry, busy, onEdit, onRemove }) {
  const { t } = useI18n();
  const title = kind === "word" ? entry.word : entry.name;
  const subtitle =
    kind === "word"
      ? [
          entry.translation,
          entry.languageName
            ? t("common.inLanguage", { language: entry.languageName })
            : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : `${entry.autonym} · ${entry.region}`;

  return (
    <article className="roleCard">
      <div className="roleCard__head">
        <h3 className="roleCard__title">{title}</h3>
        <StatusBadge state={entry.reviewState} />
      </div>

      <p className="roleCard__subtitle">{subtitle}</p>

      <div className="roleCard__meta">
        <span>
          {t(kind === "word" ? "common.word" : "common.language")}
        </span>
        <span>{t("admin.content.updated", { date: formatDate(entry.updatedAt) })}</span>
        {kind === "language" ? (
          <span>
            {t("admin.content.speakers", {
              count: Number(entry.speakers).toLocaleString(),
            })}
          </span>
        ) : null}
        {entry.removalRequestedAt ? (
          <span>{t("admin.content.removalOpen")}</span>
        ) : null}
      </div>

      <div className="roleActions">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => onEdit(kind, entry)}
        >
          {t("admin.content.edit")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => onRemove(kind, entry)}
          className="border-border text-foreground hover:bg-accent"
        >
          {t("admin.content.remove")}
        </Button>
        <span className="roleHint">{t("admin.content.removeHint")}</span>
      </div>
    </article>
  );
}

function ArchivedCard({ kind, entry, busy, onRestore }) {
  const { t } = useI18n();
  const title = kind === "word" ? entry.word : entry.name;
  const subtitle =
    kind === "word"
      ? [
          entry.translation,
          entry.languageName
            ? t("common.inLanguage", { language: entry.languageName })
            : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : `${entry.autonym} · ${entry.region}`;

  return (
    <article className="roleCard roleCard--removed">
      <div className="roleCard__head">
        <h3 className="roleCard__title">{title}</h3>
        <StatusBadge state="removed" />
      </div>

      <p className="roleCard__subtitle">{subtitle}</p>

      <div className="roleCard__meta">
        <span>
          {t(kind === "word" ? "common.word" : "common.language")}
        </span>
        <span>{t("admin.archive.removed", { date: formatDate(entry.deletedAt) })}</span>
        {kind === "language" ? (
          <span>
            {t("admin.content.speakers", {
              count: Number(entry.speakers).toLocaleString(),
            })}
          </span>
        ) : null}
      </div>

      {entry.deletionReason ? (
        <p className="roleCard__note roleCard__note--danger">
          {t("admin.archive.reason", { reason: entry.deletionReason })}
        </p>
      ) : null}

      <div className="roleActions">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => onRestore(kind, entry)}
        >
          {busy ? t("admin.archive.restoring") : t("admin.archive.restore")}
        </Button>
        <span className="roleHint">{t("admin.archive.hint")}</span>
      </div>
    </article>
  );
}

/**
 * Admin desk: account approval and lifecycle, published-content editing and
 * removal, and the logical-removal archive. New content can also be authored on
 * /contribute, where admin saves are published immediately by the API.
 */
export default function AdminDashboard({ user }) {
  const [tab, setTab] = useState("accounts");
  const [accounts, setAccounts] = useState([]);
  const [content, setContent] = useState({ words: [], languages: [] });
  const [languages, setLanguages] = useState([]);
  const [archive, setArchive] = useState({ words: [], languages: [] });
  const [editor, setEditor] = useState(null);
  const [contentSearch, setContentSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [approvalRoles, setApprovalRoles] = useState({});
  const [roleDrafts, setRoleDrafts] = useState({});
  const { t } = useI18n();

  const loadAll = useCallback(async () => {
    try {
      const [userResponse, archiveResponse, wordResponse, languageResponse] =
        await Promise.all([
          apiFetch("/users?limit=100"),
          apiFetch("/archive?type=all&limit=100"),
          apiFetch("/words?limit=100"),
          apiFetch("/languages?limit=100"),
        ]);

      setAccounts(userResponse?.data ?? []);
      setArchive({
        words: archiveResponse?.data?.words ?? [],
        languages: archiveResponse?.data?.languages ?? [],
      });
      setContent({
        words: wordResponse?.data ?? [],
        languages: languageResponse?.data ?? [],
      });
      setLanguages(languageResponse?.data ?? []);
      setError(null);
    } catch (cause) {
      setError(cause?.message ?? t("admin.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; updates happen after the awaited API call
    loadAll();
  }, [loadAll]);

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return accounts
      .filter((account) => statusFilter === "all" || account.status === statusFilter)
      .filter((account) => roleFilter === "all" || account.role === roleFilter)
      .filter(
        (account) =>
          !query ||
          account.email.toLowerCase().includes(query) ||
          account.username.toLowerCase().includes(query),
      )
      .sort((a, b) => {
        const rank = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
        if (rank !== 0) return rank;
        return a.username.localeCompare(b.username);
      });
  }, [accounts, search, statusFilter, roleFilter]);

  const archiveCount = archive.words.length + archive.languages.length;
  const contentCount = content.words.length + content.languages.length;

  const filteredContent = useMemo(() => {
    const query = contentSearch.trim().toLowerCase();
    if (!query) return content;

    const matches = (value) => String(value ?? "").toLowerCase().includes(query);

    return {
      words: content.words.filter(
        (word) =>
          matches(word.word) ||
          matches(word.translation) ||
          matches(word.languageName),
      ),
      languages: content.languages.filter(
        (language) =>
          matches(language.name) ||
          matches(language.autonym) ||
          matches(language.region),
      ),
    };
  }, [content, contentSearch]);

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

  const runStatusChange = async (account, status, extra = {}, message) => {
    setBusyKey(account.id);
    setError(null);
    setNotice(null);

    try {
      await apiFetch(`/users/${encodeURIComponent(account.id)}/status`, {
        method: "PATCH",
        body: { status, ...extra },
      });
      setNotice(message);
      await loadAll();
    } catch (cause) {
      setError(cause?.message ?? t("admin.accounts.updateError"));
    } finally {
      setBusyKey(null);
    }
  };

  const approve = (account) => {
    const role =
      approvalRoles[account.id] ??
      (account.role === "reviewer" ? "reviewer" : "contributor");
    return runStatusChange(
      account,
      "active",
      { role },
      t("admin.accounts.approved", { name: account.username, role }),
    );
  };

  const reject = (account) => {
    const reason = window.prompt(
      t("admin.accounts.rejectPrompt", { name: account.username }),
      t("admin.accounts.rejectDefault"),
    );
    if (reason === null) return;
    return runStatusChange(
      account,
      "rejected",
      { reason: reason.trim() || t("admin.accounts.rejectFallback") },
      t("admin.accounts.rejectedNotice", { name: account.username }),
    );
  };

  const deactivate = (account) => {
    const reason = window.prompt(
      t("admin.accounts.deactivatePrompt", { name: account.username }),
      t("admin.accounts.deactivateDefault"),
    );
    if (reason === null) return;
    return runStatusChange(
      account,
      "deactivated",
      { reason: reason.trim() || t("admin.accounts.deactivateDefault") },
      t("admin.accounts.deactivatedNotice", { name: account.username }),
    );
  };

  const reactivate = (account) =>
    runStatusChange(
      account,
      "active",
      {},
      t("admin.accounts.reactivatedNotice", {
        name: account.username,
        role: account.role,
      }),
    );

  const saveRole = async (account) => {
    const role = roleDrafts[account.id] ?? account.role;
    setBusyKey(account.id);
    setError(null);
    setNotice(null);

    try {
      await apiFetch(`/users/${encodeURIComponent(account.id)}/role`, {
        method: "PATCH",
        body: { role },
      });
      setNotice(t("admin.accounts.roleSaved", { name: account.username, role }));
      await loadAll();
    } catch (cause) {
      setError(cause?.message ?? t("admin.accounts.roleError"));
    } finally {
      setBusyKey(null);
    }
  };

  const restoreArchived = async (kind, entry) => {
    setBusyKey(entry.id);
    setError(null);
    setNotice(null);

    try {
      const base = kind === "word" ? "/words" : "/languages";
      await apiFetch(`${base}/${encodeURIComponent(entry.id)}/restore`, {
        method: "POST",
      });
      setNotice(t("admin.content.restoredNotice"));
      await loadAll();
    } catch (cause) {
      setError(cause?.message ?? t("admin.content.restoreError"));
    } finally {
      setBusyKey(null);
    }
  };

  const removeContent = async (kind, entry) => {
    const reason = window.prompt(
      t("admin.content.removePrompt", {
        title: kind === "word" ? entry.word : entry.name,
      }),
      entry.removalRequestReason || t("admin.content.removeDefault"),
    );
    if (reason === null) return;

    setBusyKey(entry.id);
    setError(null);
    setNotice(null);

    try {
      const base = kind === "word" ? "/words" : "/languages";
      await apiFetch(`${base}/${encodeURIComponent(entry.id)}`, {
        method: "DELETE",
        body: { reason: reason.trim() || t("admin.content.removeDefault") },
      });
      setNotice(t("admin.content.removedNotice"));
      await loadAll();
    } catch (cause) {
      setError(cause?.message ?? t("admin.content.removeError"));
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaved = async (_data, kind, isEdit) => {
    setEditor(null);
    setNotice(
      t("admin.content.savedNotice", {
        kind: t(kind === "word" ? "common.word" : "common.language"),
        action: t(isEdit ? "common.updated" : "common.created"),
      }),
    );
    await loadAll();
  };

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-0">
      <TabsList className="roleTabs" aria-label={t("admin.title")}>
        <TabsTrigger
          value="accounts"
          className={`roleTab ${tab === "accounts" ? "is-active" : ""}`}
        >
          {t("admin.tab.accounts")}{" "}
          <span className="roleTab__count">{accounts.length}</span>
        </TabsTrigger>
        <TabsTrigger
          value="content"
          className={`roleTab ${tab === "content" ? "is-active" : ""}`}
        >
          {t("admin.tab.content")}{" "}
          <span className="roleTab__count">{contentCount}</span>
        </TabsTrigger>
        <TabsTrigger
          value="presentation"
          className={`roleTab ${tab === "presentation" ? "is-active" : ""}`}
        >
          {t("admin.tab.presentation")}
        </TabsTrigger>
        <TabsTrigger
          value="pageText"
          className={`roleTab ${tab === "pageText" ? "is-active" : ""}`}
        >
          {t("admin.tab.pageText")}
        </TabsTrigger>
        <TabsTrigger
          value="archive"
          className={`roleTab ${tab === "archive" ? "is-active" : ""}`}
        >
          {t("admin.tab.archive")}{" "}
          <span className="roleTab__count">{archiveCount}</span>
        </TabsTrigger>
      </TabsList>

      <p className="roleNotice roleNotice--info">
        {tab === "accounts"
          ? t("admin.notice.accounts")
          : tab === "content"
            ? t("admin.notice.content")
            : tab === "presentation"
              ? t("admin.notice.presentation")
              : tab === "pageText"
                ? t("admin.notice.pageText")
                : t("admin.notice.archive")}
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

      {loading ? (
        <div className="roleEmpty">{t("admin.loading")}</div>
      ) : tab === "accounts" ? (
        <>
          <div className="adminFilters">
            <label className="roleField adminFilters__field">
              <span className="roleLabel">{t("admin.accounts.search")}</span>
              <Input
                className="roleInput"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("admin.accounts.searchPlaceholder")}
              />
            </label>
            <label className="roleField adminFilters__field">
              <span className="roleLabel">{t("admin.accounts.status")}</span>
              <select
                className="roleSelect"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className="roleField adminFilters__field">
              <span className="roleLabel">{t("admin.accounts.role")}</span>
              <select
                className="roleSelect"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                {ROLE_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {filteredAccounts.length === 0 ? (
            <div className="roleEmpty">{t("admin.accounts.none")}</div>
          ) : (
            <div className="roleList">
              {filteredAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  isSelf={account.id === user.id}
                  approvalRole={
                    approvalRoles[account.id] ??
                    (account.role === "reviewer" ? "reviewer" : "contributor")
                  }
                  roleDraft={roleDrafts[account.id] ?? account.role}
                  busy={busyKey === account.id}
                  onApprovalRole={(id, role) =>
                    setApprovalRoles((current) => ({ ...current, [id]: role }))
                  }
                  onRoleDraft={(id, role) =>
                    setRoleDrafts((current) => ({ ...current, [id]: role }))
                  }
                  onApprove={approve}
                  onReject={reject}
                  onSaveRole={saveRole}
                  onDeactivate={deactivate}
                  onReactivate={reactivate}
                />
              ))}
            </div>
          )}
        </>
      ) : tab === "content" ? (
        <>
          <div className="roleToolbar">
            <label className="roleField adminContentSearch">
              <span className="roleLabel">{t("admin.content.search")}</span>
              <Input
                className="roleInput"
                value={contentSearch}
                onChange={(event) => setContentSearch(event.target.value)}
                placeholder={t("admin.content.searchPlaceholder")}
              />
            </label>
            <Button asChild variant="outline" size="sm">
              <Link href="/contribute">{t("admin.content.create")}</Link>
            </Button>
          </div>

          {editor ? (
            <EntryForm
              key={`${editor.kind}-${editor.entry.id}`}
              kind={editor.kind}
              entry={editor.entry}
              languages={editorLanguages}
              roleKey="admin"
              onCancel={() => setEditor(null)}
              onSaved={handleSaved}
            />
          ) : null}

          {contentCount === 0 ? (
            <div className="roleEmpty">{t("admin.content.none")}</div>
          ) : filteredContent.words.length === 0 &&
            filteredContent.languages.length === 0 ? (
            <div className="roleEmpty">{t("admin.content.noMatch")}</div>
          ) : (
            <>
              {filteredContent.languages.length > 0 ? (
                <section className="roleSection">
                  <div className="roleSection__head">
                    <h2 className="roleSection__title">{t("admin.content.languages")}</h2>
                    <span className="roleSection__hint">
                      {filteredContent.languages.length}
                    </span>
                  </div>
                  <div className="roleList">
                    {filteredContent.languages.map((entry) => (
                      <ContentCard
                        key={entry.id}
                        kind="language"
                        entry={entry}
                        busy={busyKey === entry.id}
                        onEdit={(kind, value) => setEditor({ kind, entry: value })}
                        onRemove={removeContent}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {filteredContent.words.length > 0 ? (
                <section className="roleSection">
                  <div className="roleSection__head">
                    <h2 className="roleSection__title">{t("admin.content.words")}</h2>
                    <span className="roleSection__hint">
                      {filteredContent.words.length}
                    </span>
                  </div>
                  <div className="roleList">
                    {filteredContent.words.map((entry) => (
                      <ContentCard
                        key={entry.id}
                        kind="word"
                        entry={entry}
                        busy={busyKey === entry.id}
                        onEdit={(kind, value) => setEditor({ kind, entry: value })}
                        onRemove={removeContent}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </>
      ) : tab === "presentation" ? (
        <SiteImageManager />
      ) : tab === "pageText" ? (
        <PageContentManager />
      ) : archiveCount === 0 ? (
        <div className="roleEmpty">{t("admin.archive.none")}</div>
      ) : (
        <>
          {archive.languages.length > 0 ? (
            <section className="roleSection">
              <div className="roleSection__head">
                <h2 className="roleSection__title">{t("admin.archive.languages")}</h2>
                <span className="roleSection__hint">{archive.languages.length}</span>
              </div>
              <div className="roleList">
                {archive.languages.map((entry) => (
                  <ArchivedCard
                    key={entry.id}
                    kind="language"
                    entry={entry}
                    busy={busyKey === entry.id}
                    onRestore={restoreArchived}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {archive.words.length > 0 ? (
            <section className="roleSection">
              <div className="roleSection__head">
                <h2 className="roleSection__title">{t("admin.archive.words")}</h2>
                <span className="roleSection__hint">{archive.words.length}</span>
              </div>
              <div className="roleList">
                {archive.words.map((entry) => (
                  <ArchivedCard
                    key={entry.id}
                    kind="word"
                    entry={entry}
                    busy={busyKey === entry.id}
                    onRestore={restoreArchived}
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
