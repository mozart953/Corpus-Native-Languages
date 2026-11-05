/**
 * End-to-end moderation smoke test.
 *
 * Requires the API to be running and the seed accounts to exist:
 *
 *   npm run db:seed
 *   npm start            # in another terminal
 *   npm run test:flow
 *
 * It creates a word, walks it through reviewer and admin approval, soft-deletes
 * it, checks the audit trail and restores it, then removes the smoke row and
 * its audit entries from the development database.
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

  console.log("\n1. Contributor creates a pending word");
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
  assert(create.payload.data.reviewState === "pending", "new contributor content is pending");
  assert(create.payload.data.verified === false, "new content is not verified");
  const wordId = create.payload.data.id;

  console.log("\n2. Pending content is hidden from public reads");
  const publicBefore = await call(`/words?q=${encodeURIComponent(marker)}`);
  assert(publicBefore.payload.meta.total === 0, "public search does not expose pending content");

  console.log("\n3. Reviewer sees it in the queue and recommends approval");
  const queue = await call("/reviews/queue?type=word", { cookie: reviewerCookie });
  assert(queue.status === 200, `review queue returns 200 (got ${queue.status})`);
  assert(queue.payload.data.words.some((word) => word.id === wordId), "word appears in reviewer queue");

  const reviewerDecision = await call(`/words/${wordId}/review`, {
    method: "POST",
    cookie: reviewerCookie,
    body: { decision: "approve", comment: "Looks correct to me." },
  });
  assert(reviewerDecision.status === 200, `reviewer review returns 200 (got ${reviewerDecision.status})`);
  assert(reviewerDecision.payload.data.reviewState === "reviewer_approved", "reviewer approval is not final");

  const publicAfterReviewer = await call(`/words?q=${encodeURIComponent(marker)}`);
  assert(publicAfterReviewer.payload.meta.total === 0, "reviewer approval still does not publish content");

  console.log("\n4. Contributor cannot remove content");
  const forbiddenDelete = await call(`/words/${wordId}`, {
    method: "DELETE",
    cookie: contributorCookie,
    body: { reason: "should not work" },
  });
  assert(forbiddenDelete.status === 403, `contributor delete is forbidden (got ${forbiddenDelete.status})`);

  console.log("\n5. Admin makes the final approval");
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

  console.log("\n6. Admin soft-deletes and content disappears from public reads");
  const remove = await call(`/words/${wordId}`, {
    method: "DELETE",
    cookie: adminCookie,
    body: { reason: "Automated smoke test cleanup." },
  });
  assert(remove.status === 200, `admin delete returns 200 (got ${remove.status})`);
  assert(remove.payload.data.reviewState === "removed", "removed content is marked removed");

  const publicAfterDelete = await call(`/words?q=${encodeURIComponent(marker)}`);
  assert(publicAfterDelete.payload.meta.total === 0, "removed word is hidden from the public");

  console.log("\n7. Audit trail keeps the removed content and the date");
  const history = await call(`/reviews/history?entityType=word&entityId=${wordId}`, {
    cookie: adminCookie,
  });
  assert(history.status === 200, `history returns 200 (got ${history.status})`);
  const actions = history.payload.data.map((entry) => entry.action);
  for (const action of ["submitted", "reviewer_approved", "approved", "removed"]) {
    assert(actions.includes(action), `audit log contains "${action}"`);
  }
  const removedEntry = history.payload.data.find((entry) => entry.action === "removed");
  assert(Boolean(removedEntry.createdAt), "removal log carries a timestamp");
  assert(removedEntry.snapshot?.word === marker, "removal log carries the content snapshot");

  console.log("\n8. Admin can restore the logically removed word");
  const restore = await call(`/words/${wordId}/restore`, {
    method: "POST",
    cookie: adminCookie,
  });
  assert(restore.status === 200, `restore returns 200 (got ${restore.status})`);
  assert(restore.payload.data.reviewState === "pending", "restored content returns to pending");
  assert(restore.payload.data.deletedAt === null, "restored content is no longer deleted");

  console.log("\n9. Remove the smoke word from the development database");
  await prisma.auditLog.deleteMany({ where: { entityId: wordId } });
  await prisma.word.deleteMany({ where: { id: wordId } });
  assert(true, "smoke word and its audit rows cleaned up");

  console.log("\nAll moderation checks passed.");
  console.log(`WORD_ID=${wordId}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
