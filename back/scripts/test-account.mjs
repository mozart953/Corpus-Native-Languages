/**
 * Account management smoke test.
 *
 * Requires the API, the seed accounts and a working database. It registers two
 * temporary users, exercises the cooldowns, uniqueness checks, password policy,
 * emergency requests, admin-assisted edits and cancellation, then deletes the
 * temporary rows and their audit entries.
 */
import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { encode } from "@auth/core/jwt";

const here = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(here, "../.env") });

const API = "http://localhost:4000/api/v1";
const secret = process.env.AUTH_SECRET;
const cookieName = process.env.AUTH_COOKIE_NAME ?? "corpus.session-token";
const DAY = 24 * 60 * 60 * 1000;

const createdUserIds = [];
const createdRequestIds = [];

async function login(email, password) {
  const response = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(payload)}`);
  }
  return payload.data;
}

async function tokenFor(user) {
  const token = await encode({
    token: {
      id: user.id,
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      provider: user.provider,
      status: user.status,
    },
    secret,
    salt: cookieName,
    maxAge: 30 * 60,
  });
  return `${cookieName}=${token}`;
}

async function call(path, { method = "GET", cookie, body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  return { status: response.status, payload };
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
  console.log(`  ok  ${message}`);
}

async function registerTempUser(suffix) {
  const stamp = `${Date.now()}-${suffix}`;
  const email = `smoke-account-${stamp}@corpus.local`;
  const username = `Smoke Account ${stamp}`;
  const password = "TempPass123!";

  const registration = await call("/auth/register", {
    method: "POST",
    body: { username, email, password },
  });
  assert(registration.status === 201, `register temporary user ${suffix}`);
  createdUserIds.push(registration.payload.data.id);

  return {
    id: registration.payload.data.id,
    email,
    username,
    password,
  };
}

async function activate(user, adminCookie) {
  const approval = await call(`/users/${user.id}/status`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { status: "active", role: "contributor" },
  });
  assert(approval.status === 200, `activate ${user.username}`);

  const profile = await login(user.email, user.password);
  return { ...user, cookie: await tokenFor(profile) };
}

async function main() {
  const { prisma } = await import("../src/config/database.js");

  try {
    const admin = await login("admin@corpus.local", "Admin123!");
    const adminCookie = await tokenFor(admin);
    const contributor = await login(
      "contributor@corpus.local",
      "Contributor123!",
    );

    const userA = await activate(await registerTempUser("a"), adminCookie);

    const initial = await call("/account", { cookie: userA.cookie });
    assert(initial.status === 200, "a signed-in user can read their account");
    assert(
      initial.payload?.data?.cooldowns?.username?.canChange === true,
      "a new account starts with no username cooldown",
    );
    assert(
      initial.payload?.data?.policy?.cooldowns?.password === 15,
      "the password cooldown is 15 days",
    );

    const duplicateUsername = await call("/account/username", {
      method: "PATCH",
      cookie: userA.cookie,
      body: { username: `  ${admin.username.toUpperCase()}  ` },
    });
    assert(
      duplicateUsername.status === 409,
      "usernames are unique ignoring case and spacing",
    );

    const usernameChange = await call("/account/username", {
      method: "PATCH",
      cookie: userA.cookie,
      body: { username: `${userA.username} Renamed` },
    });
    assert(usernameChange.status === 200, "the user changes their username");
    assert(
      usernameChange.payload?.data?.profile?.username?.endsWith("Renamed"),
      "the new username is returned",
    );
    assert(
      usernameChange.payload?.data?.cooldowns?.username?.canChange === false,
      "the username cooldown starts immediately",
    );

    const usernameAgain = await call("/account/username", {
      method: "PATCH",
      cookie: userA.cookie,
      body: { username: `${userA.username} Again` },
    });
    assert(
      usernameAgain.status === 409,
      "a second username change is blocked by the cooldown",
    );

    const wrongEmailPassword = await call("/account/email", {
      method: "PATCH",
      cookie: userA.cookie,
      body: {
        email: `smoke-new-${Date.now()}@corpus.local`,
        currentPassword: "not-the-password",
      },
    });
    assert(
      wrongEmailPassword.status === 400,
      "an email change requires the current password",
    );

    const duplicateEmail = await call("/account/email", {
      method: "PATCH",
      cookie: userA.cookie,
      body: {
        email: admin.email.toUpperCase(),
        currentPassword: userA.password,
      },
    });
    assert(
      duplicateEmail.status === 409,
      "email addresses cannot be reused by another account",
    );

    const newEmail = `smoke-changed-${Date.now()}@corpus.local`;
    const emailChange = await call("/account/email", {
      method: "PATCH",
      cookie: userA.cookie,
      body: { email: newEmail, currentPassword: userA.password },
    });
    assert(emailChange.status === 200, "the user changes their email");
    assert(
      emailChange.payload?.data?.profile?.email === newEmail,
      "the email is applied immediately",
    );
    assert(
      emailChange.payload?.data?.cooldowns?.email?.canChange === false,
      "the email cooldown starts immediately",
    );

    const emailAgain = await call("/account/email", {
      method: "PATCH",
      cookie: userA.cookie,
      body: {
        email: `smoke-second-${Date.now()}@corpus.local`,
        currentPassword: userA.password,
      },
    });
    assert(
      emailAgain.status === 409,
      "a second email change is blocked by the cooldown",
    );
    assert(
      new Date(emailChange.payload.data.cooldowns.email.nextAllowedAt).getTime() -
        Date.now() >
        29 * DAY,
      "the email cooldown is approximately 30 days",
    );

    const weakPassword = await call("/account/password", {
      method: "PATCH",
      cookie: userA.cookie,
      body: {
        currentPassword: userA.password,
        newPassword: "weakpass",
      },
    });
    assert(
      weakPassword.status === 422,
      "weak passwords are rejected by the shared policy",
    );

    const wrongCurrentPassword = await call("/account/password", {
      method: "PATCH",
      cookie: userA.cookie,
      body: {
        currentPassword: "not-the-password",
        newPassword: "NewTemp456!",
      },
    });
    assert(
      wrongCurrentPassword.status === 400,
      "a password change requires the current password",
    );

    const samePassword = await call("/account/password", {
      method: "PATCH",
      cookie: userA.cookie,
      body: {
        currentPassword: userA.password,
        newPassword: userA.password,
      },
    });
    assert(
      samePassword.status === 400,
      "the new password must differ from the current one",
    );

    const passwordChange = await call("/account/password", {
      method: "PATCH",
      cookie: userA.cookie,
      body: {
        currentPassword: userA.password,
        newPassword: "NewTemp456!",
      },
    });
    assert(passwordChange.status === 200, "the user changes their password");
    assert(
      passwordChange.payload?.data?.cooldowns?.password?.canChange === false,
      "the password cooldown starts immediately",
    );

    const passwordAgain = await call("/account/password", {
      method: "PATCH",
      cookie: userA.cookie,
      body: {
        currentPassword: "NewTemp456!",
        newPassword: "Another789!",
      },
    });
    assert(
      passwordAgain.status === 409,
      "a second password change is blocked by the cooldown",
    );

    const requestCreate = await call("/account/requests", {
      method: "POST",
      cookie: userA.cookie,
      body: {
        reason: "Smoke test: cannot sign in from a new device.",
        fields: ["username", "email", "password"],
      },
    });
    assert(
      requestCreate.status === 201,
      "the user opens an emergency request",
    );
    assert(
      requestCreate.payload?.data?.status === "pending",
      "the emergency request starts pending",
    );
    const requestA = requestCreate.payload.data;
    createdRequestIds.push(requestA.id);

    const requestAgain = await call("/account/requests", {
      method: "POST",
      cookie: userA.cookie,
      body: { reason: "A second request.", fields: ["password"] },
    });
    assert(
      requestAgain.status === 409,
      "only one emergency request may be open per user",
    );

    const adminList = await call("/account/admin/requests?status=pending", {
      cookie: adminCookie,
    });
    assert(adminList.status === 200, "an admin lists emergency requests");
    assert(
      adminList.payload?.data?.some((row) => row.id === requestA.id),
      "the open request appears in the admin queue",
    );

    const noRequestEdit = await call(
      `/account/admin/users/${contributor.id}`,
      {
        method: "PATCH",
        cookie: adminCookie,
        body: { password: "Contributor999!" },
      },
    );
    assert(
      noRequestEdit.status === 409,
      "an admin cannot edit an account without an open request",
    );

    const emergencyUsername = `${userA.username} Emergency`;
    const emergencyEmail = `smoke-emergency-${Date.now()}@corpus.local`;
    const adminEdit = await call(
      `/account/admin/users/${userA.id}`,
      {
        method: "PATCH",
        cookie: adminCookie,
        body: {
          username: emergencyUsername,
          email: emergencyEmail,
          password: "Emergency789!",
          resolutionNote: "Verified the request and reset the account.",
        },
      },
    );
    assert(adminEdit.status === 200, "an admin edits an account with an open request");
    assert(
      adminEdit.payload?.data?.username === emergencyUsername,
      "the admin username change is applied",
    );
    assert(
      adminEdit.payload?.data?.email === emergencyEmail,
      "the admin email change is applied",
    );

    const requestAfterEdit = await call("/account/requests", {
      cookie: userA.cookie,
    });
    const completed = requestAfterEdit.payload?.data?.find(
      (row) => row.id === requestA.id,
    );
    assert(
      completed?.status === "completed",
      "the emergency request is resolved by the admin edit",
    );
    assert(
      completed?.resolutionNote?.includes("Verified"),
      "the resolution note is stored on the request",
    );

    const emergencyLogin = await login(emergencyEmail, "Emergency789!");
    assert(
      emergencyLogin.username === emergencyUsername,
      "the user can sign in with the admin-assisted credentials",
    );

    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: "user",
        entityId: userA.id,
        action: "account_emergency_changed",
      },
    });
    assert(Boolean(audit), "the admin edit writes an audit entry");

    const refreshed = await prisma.user.findUnique({ where: { id: userA.id } });
    assert(
      refreshed.usernameChangedAt &&
        Date.now() - refreshed.usernameChangedAt.getTime() < 60 * 1000,
      "the admin edit resets the username cooldown timestamp",
    );
    assert(
      refreshed.emailVerifiedAt === null,
      "an email change clears the verified timestamp for future verification",
    );

    const userB = await activate(await registerTempUser("b"), adminCookie);
    const passwordOnlyRequest = await call("/account/requests", {
      method: "POST",
      cookie: userB.cookie,
      body: {
        reason: "Smoke test: forgot the password.",
        fields: ["password"],
      },
    });
    assert(
      passwordOnlyRequest.status === 201,
      "a second user opens a password-only request",
    );
    const requestB = passwordOnlyRequest.payload.data;
    createdRequestIds.push(requestB.id);

    const notRequested = await call(`/account/admin/users/${userB.id}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { username: `Smoke B Renamed ${Date.now()}` },
    });
    assert(
      notRequested.status === 400,
      "an admin cannot change a field the request did not name",
    );

    const passwordReset = await call(`/account/admin/users/${userB.id}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { password: "ResetPass789!" },
    });
    assert(
      passwordReset.status === 200,
      "an admin can change a field the request named",
    );

    const cancelRequest = await call("/account/requests", {
      method: "POST",
      cookie: userB.cookie,
      body: {
        reason: "Smoke test: this one will be cancelled.",
        fields: ["email"],
      },
    });
    assert(cancelRequest.status === 201, "the user opens another request");
    const requestC = cancelRequest.payload.data;
    createdRequestIds.push(requestC.id);

    const cancel = await call(
      `/account/requests/${encodeURIComponent(requestC.id)}/cancel`,
      { method: "POST", cookie: userB.cookie },
    );
    assert(cancel.status === 200, "the user cancels their request");
    assert(
      cancel.payload?.data?.status === "cancelled",
      "the cancelled request is no longer open",
    );

    const afterCancelEdit = await call(`/account/admin/users/${userB.id}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { email: `smoke-blocked-${Date.now()}@corpus.local` },
    });
    assert(
      afterCancelEdit.status === 409,
      "a cancelled request no longer unlocks the account",
    );

    const forbidden = await call("/account/admin/requests", {
      cookie: userB.cookie,
    });
    assert(
      forbidden.status === 403,
      "non-admins cannot read the emergency queue",
    );
  } finally {
    await prisma.auditLog
      .deleteMany({
        where: {
          OR: [
            { entityId: { in: createdUserIds } },
            { entityId: { in: createdRequestIds } },
          ],
        },
      })
      .catch(() => undefined);

    await prisma.user
      .deleteMany({ where: { id: { in: createdUserIds } } })
      .catch(() => undefined);

    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
