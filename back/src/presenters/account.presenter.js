import {
  ACCOUNT_CHANGE_FIELDS,
  ACCOUNT_COOLDOWN_DAYS,
  nextAllowedAt,
} from "../models/account.model.js";
import { PASSWORD_POLICY } from "../utils/password.js";
import { toPublicUser } from "./user.presenter.js";

export function toAccountRequest(row) {
  if (!row) return null;

  const fields = ACCOUNT_CHANGE_FIELDS.filter((field) => {
    if (field === "username") return row.requestUsername;
    if (field === "email") return row.requestEmail;
    return row.requestPassword;
  });

  return {
    id: row.id,
    userId: row.userId,
    reason: row.reason,
    fields,
    status: row.statusCode,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt ?? null,
    resolutionNote: row.resolutionNote ?? null,
    user: row.user
      ? {
          id: row.user.id,
          username: row.user.username,
          email: row.user.email,
          role: row.user.roleCode ?? row.user.role,
          status: row.user.statusCode ?? row.user.status,
        }
      : undefined,
    resolvedBy: row.resolvedBy
      ? {
          id: row.resolvedBy.id,
          username: row.resolvedBy.username,
          email: row.resolvedBy.email,
        }
      : null,
  };
}

/** Cooldown state for each self-service field, relative to `now`. */
export function buildCooldowns(user, now = new Date()) {
  const field = (name, changedAt) => {
    const next = nextAllowedAt(changedAt, name);
    return {
      changedAt: changedAt ?? null,
      cooldownDays: ACCOUNT_COOLDOWN_DAYS[name],
      nextAllowedAt: next,
      canChange: !next || now.getTime() >= next.getTime(),
    };
  };

  return {
    username: field("username", user.usernameChangedAt),
    email: field("email", user.emailChangedAt),
    password: field("password", user.passwordChangedAt),
  };
}

export const ACCOUNT_POLICY_RESPONSE = Object.freeze({
  cooldowns: { ...ACCOUNT_COOLDOWN_DAYS },
  password: {
    minLength: PASSWORD_POLICY.minLength,
    maxLength: PASSWORD_POLICY.maxLength,
    requiresUppercase: true,
    requiresLowercase: true,
    requiresNumber: true,
  },
});

/** The account view shared by GET /account and every self-service mutation. */
export function presentAccount(user, requests = null) {
  const payload = {
    profile: toPublicUser(user),
    cooldowns: buildCooldowns(user),
    policy: ACCOUNT_POLICY_RESPONSE,
  };

  if (Array.isArray(requests)) {
    payload.requests = requests.map(toAccountRequest);
    payload.openRequest = toAccountRequest(
      requests.find((row) => row.statusCode === "pending") ?? null,
    );
  }

  return payload;
}
