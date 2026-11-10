/**
 * Public account representation. The API keeps the familiar `role`, `status`
 * and `provider` keys while the database stores `*Code` foreign keys.
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
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
