export const ROLES = Object.freeze(["contributor", "reviewer", "admin"]);

// `local` is the only provider enabled today. Keeping the provider column and
// this list makes adding Google (or another OAuth provider) a configuration
// change rather than a schema rewrite.
export const PROVIDERS = Object.freeze(["local", "google"]);

export const DEFAULT_PROVIDER = "local";
export const DEFAULT_ROLE = "contributor";
export const DEFAULT_STATUS = "pending";

/**
 * Account lifecycle. Only `active` accounts may sign in. New registrations are
 * `pending` until an admin approves them with a contributor or reviewer role.
 */
export const USER_STATUSES = Object.freeze([
  "pending",
  "active",
  "rejected",
  "deactivated",
]);

// Roles an admin may grant at approval time. Admin accounts are promoted later.
export const APPROVAL_ROLES = Object.freeze(["contributor", "reviewer"]);

export function isValidRole(role) {
  return ROLES.includes(role);
}

export function isValidStatus(status) {
  return USER_STATUSES.includes(status);
}
