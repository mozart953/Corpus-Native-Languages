import bcrypt from "bcryptjs";

// Cost factor. 12 is a sensible default for a community server: slow enough to
// make offline guessing expensive, fast enough for an interactive login.
const BCRYPT_ROUNDS = 12;

export const PASSWORD_POLICY = Object.freeze({
  minLength: 8,
  maxLength: 128,
});

export function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

export function verifyPassword(plainPassword, passwordHash) {
  if (!passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plainPassword, passwordHash);
}

/**
 * Shared strength rule for self-service and admin-assisted password changes.
 * Registration keeps its historical length-only check so existing flows and
 * fixtures are unaffected; every later password change must pass this rule.
 *
 * Returns a human-readable error, or null when the password is acceptable.
 */
export function validatePasswordStrength(password) {
  const value = String(password ?? "");

  if (value.length < PASSWORD_POLICY.minLength) {
    return `Password must be at least ${PASSWORD_POLICY.minLength} characters.`;
  }
  if (value.length > PASSWORD_POLICY.maxLength) {
    return `Password must be at most ${PASSWORD_POLICY.maxLength} characters.`;
  }
  if (!/[a-z]/.test(value)) {
    return "Password must include a lowercase letter.";
  }
  if (!/[A-Z]/.test(value)) {
    return "Password must include an uppercase letter.";
  }
  if (!/\d/.test(value)) {
    return "Password must include a number.";
  }

  return null;
}
