"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "../../lib/i18n";
import "./Account.css";

const CHANGE_FIELDS = ["username", "email", "password"];

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

function CooldownHint({ field, cooldown, t }) {
  if (!cooldown) return null;

  if (cooldown.canChange) {
    return (
      <span className="accountHint">
        {t("account.cooldown.ready", { field: fieldLabel(t, field) })}
      </span>
    );
  }

  return (
    <span className="accountHint accountHint--locked" role="status">
      {t("account.cooldown.wait", {
        field: fieldLabel(t, field),
        date: formatDate(cooldown.nextAllowedAt),
      })}
    </span>
  );
}

function UsernameForm({ profile, cooldown, busy, onSubmit, t }) {
  const [value, setValue] = useState(profile.username);
  const canChange = cooldown?.canChange ?? true;
  const dirty = value.trim() !== profile.username;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!dirty || !canChange || busy) return;
    onSubmit({ username: value.trim() });
  };

  return (
    <form className="accountForm" onSubmit={handleSubmit}>
      <div className="roleField">
        <Label className="roleLabel" htmlFor="account-username">
          {t("account.username.label")}
        </Label>
        <Input
          id="account-username"
          className="roleInput"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={busy || !canChange}
          autoComplete="username"
          minLength={2}
          maxLength={60}
        />
        <span className="roleHint">{t("account.username.hint")}</span>
      </div>

      <CooldownHint field="username" cooldown={cooldown} t={t} />

      <div className="roleActions">
        <Button
          type="submit"
          size="sm"
          disabled={busy || !canChange || !dirty}
        >
          {busy ? t("common.saving") : t("account.username.save")}
        </Button>
      </div>
    </form>
  );
}

function EmailForm({ profile, cooldown, busy, onSubmit, t }) {
  const [email, setEmail] = useState(profile.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const canChange = cooldown?.canChange ?? true;
  const dirty = email.trim().toLowerCase() !== profile.email;
  const canSubmit =
    canChange && dirty && email.trim().length > 0 && currentPassword.length > 0;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit || busy) return;
    onSubmit({ email: email.trim(), currentPassword });
  };

  return (
    <form className="accountForm" onSubmit={handleSubmit}>
      <div className="roleField">
        <Label className="roleLabel" htmlFor="account-email">
          {t("account.email.label")}
        </Label>
        <Input
          id="account-email"
          className="roleInput"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={busy || !canChange}
          autoComplete="email"
        />
        <span className="roleHint">{t("account.email.hint")}</span>
      </div>

      <div className="roleField">
        <Label className="roleLabel" htmlFor="account-email-password">
          {t("account.email.currentPassword")}
        </Label>
        <Input
          id="account-email-password"
          className="roleInput"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          disabled={busy || !canChange}
          autoComplete="current-password"
        />
      </div>

      <CooldownHint field="email" cooldown={cooldown} t={t} />

      <div className="roleActions">
        <Button type="submit" size="sm" disabled={busy || !canSubmit}>
          {busy ? t("common.saving") : t("account.email.save")}
        </Button>
      </div>
    </form>
  );
}

function PasswordForm({ cooldown, busy, onSubmit, t }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState(null);
  const canChange = cooldown?.canChange ?? true;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (busy || !canChange) return;

    if (!currentPassword || !newPassword) {
      setLocalError(t("account.password.required"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError(t("account.password.mismatch"));
      return;
    }

    setLocalError(null);
    onSubmit({ currentPassword, newPassword });
  };

  return (
    <form className="accountForm" onSubmit={handleSubmit}>
      <div className="roleField">
        <Label className="roleLabel" htmlFor="account-current-password">
          {t("account.password.current")}
        </Label>
        <Input
          id="account-current-password"
          className="roleInput"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          disabled={busy || !canChange}
          autoComplete="current-password"
        />
      </div>

      <div className="roleField">
        <Label className="roleLabel" htmlFor="account-new-password">
          {t("account.password.new")}
        </Label>
        <Input
          id="account-new-password"
          className="roleInput"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          disabled={busy || !canChange}
          autoComplete="new-password"
        />
        <span className="roleHint">{t("account.password.hint")}</span>
      </div>

      <div className="roleField">
        <Label className="roleLabel" htmlFor="account-confirm-password">
          {t("account.password.confirm")}
        </Label>
        <Input
          id="account-confirm-password"
          className="roleInput"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={busy || !canChange}
          autoComplete="new-password"
        />
      </div>

      {localError ? (
        <p className="roleError accountForm__error" role="alert">
          {localError}
        </p>
      ) : null}

      <CooldownHint field="password" cooldown={cooldown} t={t} />

      <div className="roleActions">
        <Button
          type="submit"
          size="sm"
          disabled={
            busy ||
            !canChange ||
            !currentPassword ||
            !newPassword ||
            !confirmPassword
          }
        >
          {busy ? t("common.saving") : t("account.password.save")}
        </Button>
      </div>
    </form>
  );
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

function OpenRequest({ request, busy, onCancel, t }) {
  return (
    <article className="roleCard roleCard--request accountRequest">
      <div className="roleCard__head">
        <h3 className="roleCard__title">{t("account.emergency.openTitle")}</h3>
        <span className="accountRequest__status is-pending">
          {t("account.request.status.pending")}
        </span>
      </div>
      <p className="roleCard__subtitle">
        {t("account.emergency.opened", { date: formatDate(request.createdAt) })}
      </p>
      <RequestFields fields={request.fields} t={t} />
      <p className="roleCard__body">{request.reason}</p>
      <div className="roleActions">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => onCancel(request)}
        >
          {busy ? t("common.saving") : t("account.emergency.cancel")}
        </Button>
        <span className="roleHint">{t("account.emergency.cancelHint")}</span>
      </div>
    </article>
  );
}

function RequestForm({ busy, onCreate, t }) {
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState({
    username: false,
    email: false,
    password: false,
  });

  const chosen = CHANGE_FIELDS.filter((field) => selected[field]);
  const canSubmit = reason.trim().length >= 5 && chosen.length > 0;

  const toggle = (field) => {
    setSelected((current) => ({ ...current, [field]: !current[field] }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit || busy) return;
    onCreate({ reason: reason.trim(), fields: chosen });
  };

  return (
    <form className="roleCard accountForm" onSubmit={handleSubmit}>
      <div className="roleField">
        <Label className="roleLabel" htmlFor="account-request-reason">
          {t("account.emergency.reason")}
        </Label>
        <Textarea
          id="account-request-reason"
          className="roleTextarea"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t("account.emergency.reasonPlaceholder")}
          disabled={busy}
          maxLength={500}
        />
      </div>

      <fieldset className="accountRequest__choiceSet">
        <legend className="roleLabel">
          {t("account.emergency.fields")}
        </legend>
        <div className="accountRequest__choices">
          {CHANGE_FIELDS.map((field) => (
            <label className="accountCheck" key={field}>
              <input
                type="checkbox"
                checked={selected[field]}
                onChange={() => toggle(field)}
                disabled={busy}
              />
              <span>{fieldLabel(t, field)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="roleActions">
        <Button type="submit" size="sm" disabled={busy || !canSubmit}>
          {busy ? t("common.saving") : t("account.emergency.submit")}
        </Button>
        <span className="roleHint">{t("account.emergency.submitHint")}</span>
      </div>
    </form>
  );
}

function RequestHistory({ requests, t }) {
  if (requests.length === 0) {
    return <div className="roleEmpty">{t("account.emergency.none")}</div>;
  }

  return (
    <div className="roleList accountRequest__history">
      {requests.map((request) => (
        <article className="roleCard" key={request.id}>
          <div className="roleCard__head">
            <h3 className="roleCard__title">
              {t("account.emergency.historyTitle", {
                date: formatDate(request.createdAt),
              })}
            </h3>
            <span
              className={`accountRequest__status is-${request.status}`}
            >
              {t(`account.request.status.${request.status}`)}
            </span>
          </div>
          <RequestFields fields={request.fields} t={t} />
          <p className="roleCard__body">{request.reason}</p>
          {request.resolutionNote ? (
            <p className="roleHint">
              {t("account.emergency.adminNote", {
                note: request.resolutionNote,
              })}
            </p>
          ) : null}
          {request.resolvedAt ? (
            <p className="roleCard__meta">
              <span>
                {t("account.emergency.resolved", {
                  date: formatDate(request.resolvedAt),
                })}
              </span>
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

/**
 * Self-service account desk.
 *
 * The API is the source of truth for cooldowns, uniqueness and password rules.
 * The page mirrors those rules to disable forms early, but every save still
 * goes through the server so a stale tab cannot bypass a cooldown.
 */
export default function AccountDashboard({ onProfileChanged }) {
  const { t } = useI18n();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await apiFetch("/account");
      setAccount(response?.data ?? null);
      setError(null);
    } catch (cause) {
      setError(cause?.message ?? t("account.error.load"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; updates happen after the awaited API call
    load();
  }, [load]);

  const run = async ({ key, path, method = "PATCH", body, message }) => {
    setBusy(key);
    setError(null);
    setNotice(null);

    try {
      await apiFetch(path, { method, body });
      await load();
      await onProfileChanged?.();
      setNotice(message);
    } catch (cause) {
      setError(cause?.message ?? t("account.error.save"));
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="roleEmpty">{t("account.loading")}</div>;
  }

  if (!account) {
    return (
      <div className="roleGate">
        <h2 className="roleGate__title">{t("account.error.title")}</h2>
        <p className="roleGate__text">{error ?? t("account.error.load")}</p>
        <Button type="button" onClick={load}>
          {t("account.error.retry")}
        </Button>
      </div>
    );
  }

  const { profile, cooldowns, requests = [], openRequest } = account;

  if (profile.status !== "active") {
    return <div className="roleEmpty">{t("account.error.unavailable")}</div>;
  }

  return (
    <div className="accountPage">
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
        <div className="roleCard accountSummary">
          <div className="roleCard__head">
            <h2 className="roleCard__title">{profile.username}</h2>
            <span className="rolePill">{profile.role}</span>
          </div>
          <p className="roleCard__subtitle">{profile.email}</p>
          <div className="roleCard__meta">
            <span>
              {t("account.summary.memberSince", {
                date: formatDate(profile.createdAt),
              })}
            </span>
            <span>
              {t("account.summary.lastSignIn", {
                date: profile.lastLoginAt
                  ? formatDate(profile.lastLoginAt)
                  : t("account.summary.never"),
              })}
            </span>
          </div>
          <p className="roleHint">
            {profile.emailVerifiedAt
              ? t("account.verification.verified", {
                  date: formatDate(profile.emailVerifiedAt),
                })
              : t("account.verification.note")}
          </p>
          {profile.pendingEmail ? (
            <p className="roleHint">
              {t("account.verification.pending", {
                email: profile.pendingEmail,
              })}
            </p>
          ) : null}
        </div>
      </section>

      <section className="roleSection">
        <div className="roleSection__head">
          <h2 className="roleSection__title">{t("account.details.title")}</h2>
          <span className="roleSection__hint">{t("account.details.hint")}</span>
        </div>

        <div className="accountGrid">
          <article className="roleCard">
            <div className="roleSection__head">
              <h3 className="roleCard__title">{t("account.username.title")}</h3>
            </div>
            <p className="roleCard__subtitle">{t("account.username.description")}</p>
            <UsernameForm
              key={`username-${profile.username}`}
              profile={profile}
              cooldown={cooldowns?.username}
              busy={busy === "username"}
              t={t}
              onSubmit={(body) =>
                run({
                  key: "username",
                  path: "/account/username",
                  body,
                  message: t("account.username.saved"),
                })
              }
            />
          </article>

          <article className="roleCard">
            <div className="roleSection__head">
              <h3 className="roleCard__title">{t("account.email.title")}</h3>
            </div>
            <p className="roleCard__subtitle">{t("account.email.description")}</p>
            <EmailForm
              key={`email-${profile.email}`}
              profile={profile}
              cooldown={cooldowns?.email}
              busy={busy === "email"}
              t={t}
              onSubmit={(body) =>
                run({
                  key: "email",
                  path: "/account/email",
                  body,
                  message: t("account.email.saved"),
                })
              }
            />
          </article>

          <article className="roleCard accountCard--wide">
            <div className="roleSection__head">
              <h3 className="roleCard__title">{t("account.password.title")}</h3>
            </div>
            <p className="roleCard__subtitle">
              {t("account.password.description")}
            </p>
            <PasswordForm
              key={`password-${profile.passwordChangedAt ?? "never"}`}
              cooldown={cooldowns?.password}
              busy={busy === "password"}
              t={t}
              onSubmit={(body) =>
                run({
                  key: "password",
                  path: "/account/password",
                  body,
                  message: t("account.password.saved"),
                })
              }
            />
          </article>
        </div>
      </section>

      <section className="roleSection">
        <div className="roleSection__head">
          <h2 className="roleSection__title">{t("account.emergency.title")}</h2>
          <span className="roleSection__hint">
            {t("account.emergency.hint")}
          </span>
        </div>

        <p className="roleNotice roleNotice--info">
          {t("account.emergency.notice")}
        </p>

        {openRequest ? (
          <OpenRequest
            request={openRequest}
            busy={busy === "cancel-request"}
            t={t}
            onCancel={(request) =>
              run({
                key: "cancel-request",
                path: `/account/requests/${encodeURIComponent(
                  request.id,
                )}/cancel`,
                method: "POST",
                message: t("account.emergency.cancelled"),
              })
            }
          />
        ) : (
          <RequestForm
            busy={busy === "create-request"}
            t={t}
            onCreate={(body) =>
              run({
                key: "create-request",
                path: "/account/requests",
                method: "POST",
                body,
                message: t("account.emergency.created"),
              })
            }
          />
        )}

        <div className="roleSection__head accountRequest__historyHead">
          <h3 className="roleSection__title">
            {t("account.emergency.history")}
          </h3>
        </div>
        <RequestHistory requests={requests} t={t} />
      </section>
    </div>
  );
}
