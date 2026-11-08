import bcrypt from "bcryptjs";

// Cost factor. 12 is a sensible default for a community server: slow enough to
// make offline guessing expensive, fast enough for an interactive login.
const BCRYPT_ROUNDS = 12;

export function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

export function verifyPassword(plainPassword, passwordHash) {
  if (!passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plainPassword, passwordHash);
}
