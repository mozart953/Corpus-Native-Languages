/**
 * Public account representation. The API keeps the familiar `role`, `status`
 * and `provider` keys while the database stores `*Code` foreign keys.
 *
 * `usernameKey` is deliberately omitted: it is an internal uniqueness key, not
 * something clients should read or send back.
 */
export function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    provider: user.providerCode ?? user.provider,
    role: user.roleCode ?? user.role,
    status: user.statusCode ?? user.status,
    statusReason: user.statusReason ?? null,
    statusChangedAt: user.statusChangedAt ?? null,
    approvedAt: user.approvedAt ?? null,
    lastLoginAt: user.lastLoginAt ?? null,
    usernameChangedAt: user.usernameChangedAt ?? null,
    emailChangedAt: user.emailChangedAt ?? null,
    passwordChangedAt: user.passwordChangedAt ?? null,
    // Preparation for the future verification flow. Email is still applied
    // immediately today and no message is sent.
    emailVerifiedAt: user.emailVerifiedAt ?? null,
    pendingEmail: user.pendingEmail ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
