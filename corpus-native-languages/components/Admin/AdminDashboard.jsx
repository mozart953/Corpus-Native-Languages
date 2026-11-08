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
import "./Admin.css";

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "rejected", label: "Rejected" },
  { value: "deactivated", label: "Deactivated" },
];

const ROLE_FILTERS = [
  { value: "all", label: "All roles" },
  { value: "contributor", label: "Contributors" },
  { value: "reviewer", label: "Reviewers" },
  { value: "admin", label: "Admins" },
];

const APPROVAL_ROLES = [
  { value: "contributor", label: "Contributor" },
  { value: "reviewer", label: "Reviewer" },
];

const ACTIVE_ROLES = [
  { value: "contributor", label: "Contributor" },
  { value: "reviewer", label: "Reviewer" },
  { value: "admin", label: "Admin" },
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
        <span>Joined {formatDate(account.createdAt)}</span>
        <span>
          {account.lastLoginAt
            ? `Last sign-in ${formatDate(account.lastLoginAt)}`
            : "Never signed in"}
        </span>
        {isSelf ? <span>This is your account</span> : null}
      </div>

      {account.statusReason ? (
        <p className="roleCard__note roleCard__note--danger">
          {account.statusReason}
        </p>
      ) : null}

      {canApprove ? (
        <div className="adminAccount__actions">
          <label className="roleField adminAccount__roleField">
            <span className="roleLabel">Approve as</span>
            <select
              className="roleSelect"
              value={approvalRole}
              onChange={(event) => onApprovalRole(account.id, event.target.value)}
              disabled={busy}
            >
              {APPROVAL_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
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
              {busy ? "Saving…" : "Approve account"}
            </Button>
            {account.status === "pending" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => onReject(account)}
                className="border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                Reject
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {isActive ? (
        <div className="adminAccount__actions">
          <label className="roleField adminAccount__roleField">
            <span className="roleLabel">Role</span>
            <select
              className="roleSelect"
              value={roleDraft}
              onChange={(event) => onRoleDraft(account.id, event.target.value)}
              disabled={busy || isSelf}
            >
              {ACTIVE_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
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
              Save role
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || isSelf}
              onClick={() => onDeactivate(account)}
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              Deactivate
            </Button>
          </div>
          {isSelf ? (
            <p className="roleHint adminAccount__hint">
              Your own role and status cannot be changed from this screen.
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
            {busy ? "Saving…" : "Reactivate account"}
          </Button>
          <span className="roleHint">
            The account returns with its previous {account.role} role; change the
            role afterwards if needed.
          </span>
        </div>
      ) : null}
    </article>
  );
}

function ContentCard({ kind, entry, busy, onEdit, onRemove }) {
  const title = kind === "word" ? entry.word : entry.name;
  const subtitle =
    kind === "word"
      ? [entry.translation, entry.languageName ? `in ${entry.languageName}` : null]
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
        <span>{kind === "word" ? "Word" : "Language"}</span>
        <span>Updated {formatDate(entry.updatedAt)}</span>
        {kind === "language" ? (
          <span>{Number(entry.speakers).toLocaleString()} speakers</span>
        ) : null}
        {entry.removalRequestedAt ? <span>Removal request open</span> : null}
      </div>

      <div className="roleActions">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => onEdit(kind, entry)}
        >
          Edit entry
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => onRemove(kind, entry)}
          className="border-white/20 bg-transparent text-white hover:bg-white/10"
        >
          Remove (logical)
        </Button>
        <span className="roleHint">
          Removing hides it from the public corpus and moves it to the archive.
        </span>
      </div>
    </article>
  );
}

function ArchivedCard({ kind, entry, busy, onRestore }) {
  const title = kind === "word" ? entry.word : entry.name;
  const subtitle =
    kind === "word"
      ? [entry.translation, entry.languageName ? `in ${entry.languageName}` : null]
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
        <span>{kind === "word" ? "Word" : "Language"}</span>
        <span>Removed {formatDate(entry.deletedAt)}</span>
        {kind === "language" ? (
          <span>{Number(entry.speakers).toLocaleString()} speakers</span>
        ) : null}
      </div>

      {entry.deletionReason ? (
        <p className="roleCard__note roleCard__note--danger">
          Reason: {entry.deletionReason}
        </p>
      ) : null}

      <div className="roleActions">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => onRestore(kind, entry)}
        >
          {busy ? "Restoring…" : "Restore to review queue"}
        </Button>
        <span className="roleHint">
          Restored content returns as pending and needs a final approval again.
        </span>
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
      setError(cause?.message ?? "Could not load the admin data.");
    } finally {
      setLoading(false);
    }
  }, []);

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
      setError(cause?.message ?? "Could not update this account.");
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
      `${account.username} approved as ${role}.`,
    );
  };

  const reject = (account) => {
    const reason = window.prompt(
      `Reason for rejecting ${account.username}? This is shown to the account owner.`,
      "Registration could not be verified.",
    );
    if (reason === null) return;
    return runStatusChange(
      account,
      "rejected",
      { reason: reason.trim() || "Registration rejected by an admin." },
      `${account.username} rejected.`,
    );
  };

  const deactivate = (account) => {
    const reason = window.prompt(
      `Reason for deactivating ${account.username}?`,
      "Account deactivated by an admin.",
    );
    if (reason === null) return;
    return runStatusChange(
      account,
      "deactivated",
      { reason: reason.trim() || "Account deactivated by an admin." },
      `${account.username} deactivated. Existing sessions stop working immediately.`,
    );
  };

  const reactivate = (account) =>
    runStatusChange(
      account,
      "active",
      {},
      `${account.username} reactivated with the ${account.role} role.`,
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
      setNotice(`${account.username} is now a ${role}.`);
      await loadAll();
    } catch (cause) {
      setError(cause?.message ?? "Could not change that role.");
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
      setNotice("Entry restored to the review queue as pending.");
      await loadAll();
    } catch (cause) {
      setError(cause?.message ?? "Could not restore that entry.");
    } finally {
      setBusyKey(null);
    }
  };

  const removeContent = async (kind, entry) => {
    const reason = window.prompt(
      `Reason for removing "${
        kind === "word" ? entry.word : entry.name
      }"? It will be kept in the archive with this note.`,
      entry.removalRequestReason || "Removed by an administrator.",
    );
    if (reason === null) return;

    setBusyKey(entry.id);
    setError(null);
    setNotice(null);

    try {
      const base = kind === "word" ? "/words" : "/languages";
      await apiFetch(`${base}/${encodeURIComponent(entry.id)}`, {
        method: "DELETE",
        body: { reason: reason.trim() || "Removed by an administrator." },
      });
      setNotice("Entry removed logically and moved to the archive.");
      await loadAll();
    } catch (cause) {
      setError(cause?.message ?? "Could not remove that entry.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaved = async (_data, kind, isEdit) => {
    setEditor(null);
    setNotice(
      `${kind === "word" ? "Word" : "Language"} ${
        isEdit ? "updated" : "created"
      }. Admin edits keep the current review state.`,
    );
    await loadAll();
  };

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-0">
      <TabsList className="roleTabs" aria-label="Admin views">
        <TabsTrigger
          value="accounts"
          className={`roleTab ${tab === "accounts" ? "is-active" : ""}`}
        >
          Accounts <span className="roleTab__count">{accounts.length}</span>
        </TabsTrigger>
        <TabsTrigger
          value="content"
          className={`roleTab ${tab === "content" ? "is-active" : ""}`}
        >
          Content <span className="roleTab__count">{contentCount}</span>
        </TabsTrigger>
        <TabsTrigger
          value="presentation"
          className={`roleTab ${tab === "presentation" ? "is-active" : ""}`}
        >
          Home image
        </TabsTrigger>
        <TabsTrigger
          value="archive"
          className={`roleTab ${tab === "archive" ? "is-active" : ""}`}
        >
          Archive <span className="roleTab__count">{archiveCount}</span>
        </TabsTrigger>
      </TabsList>

      <p className="roleNotice roleNotice--info">
        {tab === "accounts"
          ? "New accounts cannot sign in until you approve them. Deactivation takes effect on the next API request, even for an open session."
          : tab === "content"
            ? "Browse published content, fix entries directly, or remove something logically. Removed content moves to the archive and can be restored."
            : tab === "presentation"
              ? "The home presentation image is public. Uploads replace the current file for every visitor; removing it falls back to the NL mark."
              : "Removed words and languages stay here instead of being destroyed. The audit log keeps the full snapshot and removal date."}
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
        <div className="roleEmpty">Loading admin data…</div>
      ) : tab === "accounts" ? (
        <>
          <div className="adminFilters">
            <label className="roleField adminFilters__field">
              <span className="roleLabel">Search</span>
              <Input
                className="roleInput"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Username or email"
              />
            </label>
            <label className="roleField adminFilters__field">
              <span className="roleLabel">Status</span>
              <select
                className="roleSelect"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="roleField adminFilters__field">
              <span className="roleLabel">Role</span>
              <select
                className="roleSelect"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                {ROLE_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {filteredAccounts.length === 0 ? (
            <div className="roleEmpty">No accounts match these filters.</div>
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
              <span className="roleLabel">Search published content</span>
              <Input
                className="roleInput"
                value={contentSearch}
                onChange={(event) => setContentSearch(event.target.value)}
                placeholder="Word, translation, language or region"
              />
            </label>
            <Button asChild variant="outline" size="sm">
              <Link href="/contribute">Create a new entry</Link>
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
            <div className="roleEmpty">
              No published content yet. Use the contribution desk to create a
              word or language; admin saves publish immediately.
            </div>
          ) : filteredContent.words.length === 0 &&
            filteredContent.languages.length === 0 ? (
            <div className="roleEmpty">No content matches that search.</div>
          ) : (
            <>
              {filteredContent.languages.length > 0 ? (
                <section className="roleSection">
                  <div className="roleSection__head">
                    <h2 className="roleSection__title">Languages</h2>
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
                    <h2 className="roleSection__title">Words</h2>
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
      ) : archiveCount === 0 ? (
        <div className="roleEmpty">
          Nothing has been removed yet. Logically deleted content will appear
          here for review and restoration.
        </div>
      ) : (
        <>
          {archive.languages.length > 0 ? (
            <section className="roleSection">
              <div className="roleSection__head">
                <h2 className="roleSection__title">Removed languages</h2>
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
                <h2 className="roleSection__title">Removed words</h2>
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
