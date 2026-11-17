export const ACCOUNT_REQUEST_STATUSES = Object.freeze({
  PENDING: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});

export const ACCOUNT_REQUEST_STATUS_LIST = Object.freeze(
  Object.values(ACCOUNT_REQUEST_STATUSES),
);

// Fields an emergency request may cover and an admin may then edit.
export const ACCOUNT_CHANGE_FIELDS = Object.freeze([
  "username",
  "email",
  "password",
]);

// Self-service cooldowns, in days. An admin acting through an open emergency
// request bypasses the wait but starts a fresh cooldown for the same field.
export const ACCOUNT_COOLDOWN_DAYS = Object.freeze({
  username: 30,
  email: 30,
  password: 15,
});

const DAY_MS = 24 * 60 * 60 * 1000;

/** The instant a field becomes editable again, or null if it never changed. */
export function nextAllowedAt(changedAt, field) {
  if (!changedAt) return null;
  const days = ACCOUNT_COOLDOWN_DAYS[field];
  if (!days) return null;
  return new Date(new Date(changedAt).getTime() + days * DAY_MS);
}

export function isCooldownActive(changedAt, field, now = new Date()) {
  const next = nextAllowedAt(changedAt, field);
  return Boolean(next && now.getTime() < next.getTime());
}
