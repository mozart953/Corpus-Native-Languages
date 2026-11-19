"use client";

import { useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "../../lib/i18n";
import "../Account/Account.css";
import "./Admin.css";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fieldLabel(t, field) {
  return t(`account.field.${field}`);
}

function RequestFields({ fields, t }) {
  return (
    <div className="accountRequest__fields">
      {fields.map((field) => (
        <span className="rolePill" key={field}>
          {fieldLabel(t, field)}
        </span>
      ))}
    </div>
  );
}

function RequestEditor({ request, onResolved, t }) {
  const [username, setUsername] = useState(request.user?.username ?? "");
  const [email, setEmail] = useState(request.user?.email ?? "");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const wants = new Set(request.fields);
  const usernameChanged =
    wants.has("username") && username.trim() !== request.user?.username;
  const emailChanged =
    wants.has("email") &&
    email.trim().toLowerCase() !== request.user?.email;
  const hasChange = usernameChanged || emailChanged || password.length > 0;

  const submit = async (event) => {
    event.preventDefault();
    if (!hasChange || busy) {
      if (!hasChange) setError(t("admin.emergency.noChanges"));
      return;
    }

    const body = {};
    if (usernameChanged) body.username = username.trim();
    if (emailChanged) body.email = email.trim();
    if (password) body.password = password;
    if (note.trim()) body.resolutionNote = note.trim();

    setBusy(true);
    setError(null);

    try {
      await apiFetch(
        `/account/admin/users/${encodeURIComponent(request.userId)}`,
        { method: "PATCH", body },
      );
      setPassword("");
      await onResolved(
        t("admin.emergency.completed", {
          name: request.user?.username ?? request.userId,
        }),
      );
    } catch (cause) {
      setError(cause?.message ?? t("admin.emergency.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="roleCard roleCard--request adminEmergency__editor" onSubmit={submit}>
      <div className="roleCard__head">
        <div className="adminAccount__identity">
          <h3 className="roleCard__title">
            {request.user?.username ?? request.userId}
          </h3>
          <span className="roleCard__subtitle">{request.user?.email}</span>
        </div>
        <span className="accountRequest__status is-pending">
          {t("account.request.status.pending")}
        </span>
      </div>

      <div className="roleCard__meta">
        <span>
          {t("admin.emergency.opened", { date: formatDate(request.createdAt) })}
        </span>
        <span>{t("admin.emergency.reasonLabel")}</span>
      </div>

      <p className="roleCard__body">{request.reason}</p>
      <RequestFields fields={request.fields} t={t} />

      <div className="roleFormGrid adminEmergency__grid">
        {wants.has("username") ? (
          <div className="roleField">
            <Label className="roleLabel" htmlFor={`emergency-username-${request.id}`}>
              {t("account.username.label")}
            </Label>
            <Input
              id={`emergency-username-${request.id}`}
              className="roleInput"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={busy}
            />
          </div>
        ) : null}

        {wants.has("email") ? (
          <div className="roleField">
            <Label className="roleLabel" htmlFor={`emergency-email-${request.id}`}>
              {t("account.email.label")}
            </Label>
            <Input
              id={`emergency-email-${request.id}`}
              className="roleInput"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
            />
          </div>
        ) : null}

        {wants.has("password") ? (
          <div className="roleField">
            <Label
              className="roleLabel"
              htmlFor={`emergency-password-${request.id}`}
            >
              {t("admin.emergency.newPassword")}
            </Label>
            <Input
              id={`emergency-password-${request.id}`}
              className="roleInput"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
              autoComplete="new-password"
            />
            <span className="roleHint">{t("account.password.hint")}</span>
          </div>
        ) : null}

        <div className="roleField roleField--wide">
          <Label className="roleLabel" htmlFor={`emergency-note-${request.id}`}>
            {t("admin.emergency.note")}
          </Label>
          <Textarea
            id={`emergency-note-${request.id}`}
            className="roleTextarea"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("admin.emergency.notePlaceholder")}
            disabled={busy}
            maxLength={500}
          />
        </div>
      </div>

      {error ? (
        <p className="roleError adminEmergency__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="roleActions">
        <Button type="submit" size="sm" disabled={busy || !hasChange}>
          {busy ? t("common.saving") : t("admin.emergency.save")}
        </Button>
        <span className="roleHint">{t("admin.emergency.saveHint")}</span>
      </div>
    </form>
  );
}

/**
 * Admin desk for emergency account requests.
 *
 * Only a pending request unlocks the account editor. Saving a change resolves
 * the request on the server, which also writes the audit entry; this component
 * never edits an account without an open request.
 */
export default function EmergencyRequestManager({ requests, onChanged }) {
  const { t } = useI18n();
  const [notice, setNotice] = useState(null);

  const pending = requests.filter((request) => request.status === "pending");
  const resolved = requests.filter((request) => request.status !== "pending");

  const handleResolved = async (message) => {
    setNotice(message);
    await onChanged?.();
  };

  return (
    <div className="adminEmergency">
      {notice ? (
        <p className="roleNotice" role="status">
          {notice}
        </p>
      ) : null}

      <section className="roleSection">
        <div className="roleSection__head">
          <h2 className="roleSection__title">{t("admin.emergency.openTitle")}</h2>
          <span className="roleSection__hint">
            {t("admin.emergency.openCount", { count: pending.length })}
          </span>
        </div>

        {pending.length === 0 ? (
          <div className="roleEmpty">{t("admin.emergency.noneOpen")}</div>
        ) : (
          <div className="roleList">
            {pending.map((request) => (
              <RequestEditor
                key={request.id}
                request={request}
                onResolved={handleResolved}
                t={t}
              />
            ))}
          </div>
        )}
      </section>

      <section className="roleSection">
        <div className="roleSection__head">
          <h2 className="roleSection__title">{t("admin.emergency.historyTitle")}</h2>
          <span className="roleSection__hint">
            {t("admin.emergency.historyCount", { count: resolved.length })}
          </span>
        </div>

        {resolved.length === 0 ? (
          <div className="roleEmpty">{t("admin.emergency.noneHistory")}</div>
        ) : (
          <div className="roleList">
            {resolved.map((request) => (
              <article className="roleCard" key={request.id}>
                <div className="roleCard__head">
                  <div className="adminAccount__identity">
                    <h3 className="roleCard__title">
                      {request.user?.username ?? request.userId}
                    </h3>
                    <span className="roleCard__subtitle">
                      {request.user?.email}
                    </span>
                  </div>
                  <span
                    className={`accountRequest__status is-${request.status}`}
                  >
                    {t(`account.request.status.${request.status}`)}
                  </span>
                </div>

                <div className="roleCard__meta">
                  <span>
                    {t("admin.emergency.opened", {
                      date: formatDate(request.createdAt),
                    })}
                  </span>
                  {request.resolvedAt ? (
                    <span>
                      {t("admin.emergency.resolved", {
                        date: formatDate(request.resolvedAt),
                      })}
                    </span>
                  ) : null}
                  {request.resolvedBy ? (
                    <span>
                      {t("admin.emergency.resolvedBy", {
                        name: request.resolvedBy.username,
                      })}
                    </span>
                  ) : null}
                </div>

                <p className="roleCard__body">{request.reason}</p>
                <RequestFields fields={request.fields} t={t} />
                {request.resolutionNote ? (
                  <p className="roleHint">
                    {t("account.emergency.adminNote", {
                      note: request.resolutionNote,
                    })}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
