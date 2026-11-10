/**
 * End-to-end moderation and account lifecycle smoke test.
 *
 * Requires the API to be running and the seed accounts to exist:
 *
 *   npm run db:seed
 *   npm start            # in another terminal
 *   npm run test:flow
 *
 * It walks a draft through submission, reviewer recommendation, admin final
 * approval, a reviewer removal request, logical deletion, archive visibility
 * and restore. It also registers a pending account, checks that sign-in is
 * blocked, approves/deactivates/reactivates it, and verifies that an existing
 * session stops working as soon as the account is deactivated.
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

async function login(email, password) {
  const response = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`Login failed for ${email}: ${JSON.stringify(payload)}`);
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
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  return { status: response.status, payload };
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
  console.log(`  ok  ${message}`);
}

async function main() {
  const { prisma } = await import("../src/config/database.js");

  const admin = await login("admin@corpus.local", "Admin123!");
  const reviewer = await login("reviewer@corpus.local", "Reviewer123!");
  const contributor = await login("contributor@corpus.local", "Contributor123!");

  const adminCookie = await tokenFor(admin);
  const reviewerCookie = await tokenFor(reviewer);
  const contributorCookie = await tokenFor(contributor);

  const marker = `smoke-${Date.now()}`;
  const smokeEmail = `${marker}@example.com`;
  let wordId = null;
  let smokeUserId = null;

  try {
    console.log("\n1. New account starts pending and cannot sign in");
    const registration = await call("/auth/register", {
      method: "POST",
      body: {
        username: marker,
        email: smokeEmail,
        password: "SmokeTest123!",
      },
    });
    assert(registration.status === 201, `registration returns 201 (got ${registration.status})`);
    assert(registration.payload.data.status === "pending", "new account is pending");
    assert(registration.payload.meta.requiresApproval === true, "registration requires approval");
    smokeUserId = registration.payload.data.id;

    const blockedLogin = await call("/auth/login", {
      method: "POST",
      body: { email: smokeEmail, password: "SmokeTest123!" },
    });
    assert(blockedLogin.status === 403, `pending login is blocked (got ${blockedLogin.status})`);
    assert(blockedLogin.payload.error.code === "ACCOUNT_PENDING", "pending login returns ACCOUNT_PENDING");

    console.log("\n2. Contributor creates a private draft");
    const create = await call("/words", {
      method: "POST",
      cookie: contributorCookie,
      body: {
        languageId: "kaqchikel",
        word: marker,
        translation: "smoke test translation",
        pronunciation: "smoke",
        partOfSpeech: "noun",
        usage: "Automated flow check.",
      },
    });
    assert(create.status === 201, `create returns 201 (got ${create.status})`);
    assert(create.payload.data.reviewState === "draft", "new contributor content is a draft");
    assert(create.payload.data.verified === false, "new content is not verified");
    wordId = create.payload.data.id;

    const publicDraft = await call(`/words?q=${encodeURIComponent(marker)}`);
    assert(publicDraft.payload.meta.total === 0, "public search does not expose drafts");

    const queueBeforeSubmit = await call("/reviews/queue?type=word", { cookie: reviewerCookie });
    assert(
      !queueBeforeSubmit.payload.data.words.some((word) => word.id === wordId),
      "drafts are hidden from the moderation queue",
    );

    console.log("\n3. Draft delete is a restorable private trash move");
    const discard = await call(`/words/${wordId}`, {
      method: "DELETE",
      cookie: contributorCookie,
      body: { reason: "Changed my mind for a moment." },
    });
    assert(discard.status === 200, `draft discard returns 200 (got ${discard.status})`);
    assert(discard.payload.data.reviewState === "draft", "discarded draft keeps the draft state");
    assert(Boolean(discard.payload.data.deletedAt), "discarded draft is in the trash");

    const trash = await call("/words/trash", { cookie: contributorCookie });
    assert(
      trash.payload.data.some((word) => word.id === wordId),
      "owner sees the draft in their private trash",
    );

    const restoreDraft = await call(`/words/${wordId}/restore`, {
      method: "POST",
      cookie: contributorCookie,
    });
    assert(restoreDraft.status === 200, `draft restore returns 200 (got ${restoreDraft.status})`);
    assert(restoreDraft.payload.data.deletedAt === null, "restored draft leaves the trash");
    assert(restoreDraft.payload.data.reviewState === "draft", "restored draft is still a draft");

    console.log("\n4. Submitting moves the draft to the reviewer queue");
    const submit = await call(`/words/${wordId}/submit`, {
      method: "POST",
      cookie: contributorCookie,
    });
    assert(submit.status === 200, `submit returns 200 (got ${submit.status})`);
    assert(submit.payload.data.reviewState === "pending", "submitted content is pending");

    const publicPending = await call(`/words?q=${encodeURIComponent(marker)}`);
    assert(publicPending.payload.meta.total === 0, "pending content is not public");

    const queue = await call("/reviews/queue?type=word", { cookie: reviewerCookie });
    assert(queue.status === 200, `review queue returns 200 (got ${queue.status})`);
    assert(queue.payload.data.words.some((word) => word.id === wordId), "submitted word is in the queue");

    console.log("\n5. Contributor cannot delete submitted content");
    const forbiddenDelete = await call(`/words/${wordId}`, {
      method: "DELETE",
      cookie: contributorCookie,
      body: { reason: "should not work" },
    });
    assert(forbiddenDelete.status === 403, `contributor delete is forbidden (got ${forbiddenDelete.status})`);

    console.log("\n6. Reviewer recommendation still needs the admin");
    const reviewerDecision = await call(`/words/${wordId}/review`, {
      method: "POST",
      cookie: reviewerCookie,
      body: { decision: "approve", comment: "Looks correct to me." },
    });
    assert(reviewerDecision.status === 200, `reviewer review returns 200 (got ${reviewerDecision.status})`);
    assert(reviewerDecision.payload.data.reviewState === "reviewer_approved", "reviewer approval is not final");

    const publicAfterReviewer = await call(`/words?q=${encodeURIComponent(marker)}`);
    assert(publicAfterReviewer.payload.meta.total === 0, "reviewer approval still does not publish content");

    console.log("\n7. Admin makes the final approval");
    const adminDecision = await call(`/words/${wordId}/review`, {
      method: "POST",
      cookie: adminCookie,
      body: { decision: "approve", comment: "Final approval." },
    });
    assert(adminDecision.status === 200, `admin review returns 200 (got ${adminDecision.status})`);
    assert(adminDecision.payload.data.reviewState === "approved", "admin approval publishes the word");
    assert(adminDecision.payload.data.verified === true, "approved word is marked verified");

    const publicAfterAdmin = await call(`/words?q=${encodeURIComponent(marker)}`);
    assert(publicAfterAdmin.payload.meta.total === 1, "approved word is publicly visible");

    console.log("\n8. Reviewer requests removal; content stays public until admin acts");
    const removalRequest = await call(`/words/${wordId}/removal-request`, {
      method: "POST",
      cookie: reviewerCookie,
      body: { reason: "Possible duplicate; admin should check." },
    });
    assert(removalRequest.status === 200, `removal request returns 200 (got ${removalRequest.status})`);
    assert(Boolean(removalRequest.payload.data.removalRequestedAt), "removal request is recorded");

    const stillPublic = await call(`/words?q=${encodeURIComponent(marker)}`);
    assert(stillPublic.payload.meta.total === 1, "removal request does not hide content by itself");

    const removalQueue = await call("/reviews/queue?type=word", { cookie: adminCookie });
    assert(
      removalQueue.payload.data.removalRequests.words.some((word) => word.id === wordId),
      "removal request appears in the moderation queue",
    );

    console.log("\n9. Admin logically removes content; archive retains it");
    const remove = await call(`/words/${wordId}`, {
      method: "DELETE",
      cookie: adminCookie,
      body: { reason: "Automated smoke test cleanup." },
    });
    assert(remove.status === 200, `admin delete returns 200 (got ${remove.status})`);
    assert(remove.payload.data.reviewState === "removed", "removed content is marked removed");

    const publicAfterDelete = await call(`/words?q=${encodeURIComponent(marker)}`);
    assert(publicAfterDelete.payload.meta.total === 0, "removed word is hidden from the public");

    const archive = await call("/archive?type=word", { cookie: adminCookie });
    assert(archive.status === 200, `archive returns 200 (got ${archive.status})`);
    assert(
      archive.payload.data.words.some((word) => word.id === wordId),
      "removed word appears in the admin archive",
    );

    const reviewerArchive = await call("/archive?type=word", { cookie: reviewerCookie });
    assert(reviewerArchive.status === 403, "reviewers cannot open the admin archive");

    console.log("\n10. Audit trail keeps the removed content and the date");
    const history = await call(`/reviews/history?entityType=word&entityId=${wordId}`, {
      cookie: adminCookie,
    });
    assert(history.status === 200, `history returns 200 (got ${history.status})`);
    const actions = history.payload.data.map((entry) => entry.action);
    for (const action of [
      "draft_created",
      "draft_discarded",
      "draft_restored",
      "submitted",
      "reviewer_approved",
      "approved",
      "removal_requested",
      "removed",
    ]) {
      assert(actions.includes(action), `audit log contains "${action}"`);
    }
    const removedEntry = history.payload.data.find((entry) => entry.action === "removed");
    assert(Boolean(removedEntry.createdAt), "removal log carries a timestamp");
    assert(removedEntry.snapshot?.word === marker, "removal log carries the content snapshot");

    console.log("\n11. Admin restores the logically removed word");
    const restore = await call(`/words/${wordId}/restore`, {
      method: "POST",
      cookie: adminCookie,
    });
    assert(restore.status === 200, `restore returns 200 (got ${restore.status})`);
    assert(restore.payload.data.reviewState === "pending", "restored content returns to pending");
    assert(restore.payload.data.deletedAt === null, "restored content is no longer deleted");

    const archiveAfterRestore = await call("/archive?type=word", { cookie: adminCookie });
    assert(
      !archiveAfterRestore.payload.data.words.some((word) => word.id === wordId),
      "restored word leaves the archive",
    );

    console.log("\n12. Admin approves the pending account with a role");
    const approve = await call(`/users/${smokeUserId}/status`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { status: "active", role: "contributor" },
    });
    assert(approve.status === 200, `account approval returns 200 (got ${approve.status})`);
    assert(approve.payload.data.status === "active", "account is active after approval");
    assert(approve.payload.data.role === "contributor", "approval grants the chosen role");

    console.log("\n13. Admin promotes the account to reviewer");
    const promote = await call(`/users/${smokeUserId}/role`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { role: "reviewer" },
    });
    assert(promote.status === 200, `role change returns 200 (got ${promote.status})`);
    assert(promote.payload.data.role === "reviewer", "role change grants the reviewer role");

    const approvedLogin = await call("/auth/login", {
      method: "POST",
      body: { email: smokeEmail, password: "SmokeTest123!" },
    });
    assert(approvedLogin.status === 200, `approved account can sign in (got ${approvedLogin.status})`);

    console.log("\n14. Deactivation is immediate for an existing session");
    const smokeCookie = await tokenFor(approvedLogin.payload.data);
    const meBefore = await call("/auth/me", { cookie: smokeCookie });
    assert(meBefore.status === 200, "active account can read /auth/me");
    assert(meBefore.payload.data.role === "reviewer", "live profile reflects the reviewer role");

    const deactivate = await call(`/users/${smokeUserId}/status`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { status: "deactivated", reason: "Automated smoke test." },
    });
    assert(deactivate.status === 200, `deactivation returns 200 (got ${deactivate.status})`);

    const meAfter = await call("/auth/me", { cookie: smokeCookie });
    assert(meAfter.status === 403, `existing session is rejected after deactivation (got ${meAfter.status})`);
    assert(meAfter.payload.error.code === "ACCOUNT_DEACTIVATED", "session rejection names the account state");

    const deactivatedLogin = await call("/auth/login", {
      method: "POST",
      body: { email: smokeEmail, password: "SmokeTest123!" },
    });
    assert(deactivatedLogin.status === 403, "deactivated account cannot sign in again");

    console.log("\n15. Admin reactivates the account and keeps its reviewer role");
    const reactivate = await call(`/users/${smokeUserId}/status`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { status: "active" },
    });
    assert(reactivate.status === 200, `reactivation returns 200 (got ${reactivate.status})`);
    assert(reactivate.payload.data.status === "active", "account is active again");
    assert(
      reactivate.payload.data.role === "reviewer",
      "reactivation preserves the role the account had before deactivation",
    );

    const reactivatedLogin = await call("/auth/login", {
      method: "POST",
      body: { email: smokeEmail, password: "SmokeTest123!" },
    });
    assert(reactivatedLogin.status === 200, "reactivated account can sign in");

    console.log("\n16. Self-protection blocks self-deactivation");
    const selfDeactivate = await call(`/users/${admin.id}/status`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { status: "deactivated" },
    });
    assert(selfDeactivate.status === 409, "an admin cannot deactivate themselves");

    console.log("\nAll moderation and account checks passed.");
  } finally {
    // The smoke row and its history/audit trail are removed from the
    // development DB. ReviewDecision and RemovalRequest are polymorphic and
    // have no foreign key, so they must be deleted explicitly.
    if (wordId) {
      await prisma.removalRequest.deleteMany({ where: { entityId: wordId } });
      await prisma.reviewDecision.deleteMany({ where: { entityId: wordId } });
      await prisma.auditLog.deleteMany({ where: { entityId: wordId } });
      await prisma.word.deleteMany({ where: { id: wordId } });
    }
    if (smokeUserId) {
      await prisma.reviewDecision.deleteMany({ where: { entityId: smokeUserId } });
      await prisma.auditLog.deleteMany({ where: { entityId: smokeUserId } });
      await prisma.user.deleteMany({ where: { id: smokeUserId } });
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
