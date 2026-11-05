export const ROLES = Object.freeze(["contributor", "reviewer", "admin"]);

// `local` is the only provider enabled today. Keeping the provider column and
// this list makes adding Google (or another OAuth provider) a configuration
// change rather than a schema rewrite.
export const PROVIDERS = Object.freeze(["local", "google"]);

export const DEFAULT_PROVIDER = "local";
export const DEFAULT_ROLE = "contributor";

export function isValidRole(role) {
  return ROLES.includes(role);
}

export function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    provider: user.provider,
    role: user.role,
    createdAt: user.createdAt,
  };
}
