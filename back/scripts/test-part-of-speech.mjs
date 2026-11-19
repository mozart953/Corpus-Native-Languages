/**
 * Part-of-speech management smoke test.
 *
 * Requires the API and the seed accounts. It creates one temporary row, walks
 * it through create, localized reads, update, deactivate/hide, restore and
 * contributor restrictions, then removes the temporary row directly so the
 * corpus is left unchanged.
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

async function main() {
  const { prisma } = await import("../src/config/database.js");
  const code = `smoke-pos-${Date.now()}`;
  let created = false;

  try {
    const admin = await login("admin@corpus.local", "Admin123!");
    const contributor = await login("contributor@corpus.local", "Contributor123!");
    const adminCookie = await tokenFor(admin);
    const contributorCookie = await tokenFor(contributor);

    const create = await call("/part-of-speech", {
      method: "POST",
      cookie: adminCookie,
      body: {
        code,
        translations: { en: "smoke test", es: "prueba de humo" },
      },
    });
    assert(create.status === 201, "admin creates a part of speech");
    created = true;
    assert(create.payload?.data?.code === code, "the stable code is returned");
    assert(
      create.payload?.data?.translations?.length === 2,
      "both locale labels are stored",
    );

    const publicSpanish = await call("/part-of-speech?locale=es");
    assert(
      publicSpanish.payload?.data?.some(
        (row) => row.code === code && row.label === "prueba de humo",
      ),
      "contributors read the Spanish label",
    );

    const publicEnglish = await call("/part-of-speech?locale=en");
    assert(
      publicEnglish.payload?.data?.some(
        (row) => row.code === code && row.label === "smoke test",
      ),
      "contributors read the English label",
    );

    const forbidden = await call(`/part-of-speech/${code}`, {
      method: "PATCH",
      cookie: contributorCookie,
      body: { translations: { en: "not allowed", es: "no permitido" } },
    });
    assert(forbidden.status === 403, "contributors cannot edit the list");

    const update = await call(`/part-of-speech/${code}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: {
        translations: { en: "smoke test updated", es: "prueba actualizada" },
      },
    });
    assert(update.status === 200, "admin updates both labels");
    assert(
      update.payload?.data?.translations?.find((row) => row.locale === "es")
        ?.label === "prueba actualizada",
      "the updated Spanish label is returned",
    );

    const badWord = await call("/words", {
      method: "POST",
      cookie: contributorCookie,
      body: {
        languageId: "kaqchikel",
        word: "smoke-invalid-pos",
        translation: "smoke",
        partOfSpeech: "definitely-not-a-managed-part-of-speech",
      },
    });
    assert(
      badWord.status === 400,
      "words cannot reference an unmanaged part of speech",
    );

    const deactivate = await call(`/part-of-speech/${code}`, {
      method: "DELETE",
      cookie: adminCookie,
    });
    assert(deactivate.status === 200, "admin hides a part of speech");
    assert(deactivate.payload?.data?.isActive === false, "the row is inactive");

    const afterHide = await call("/part-of-speech?locale=en");
    assert(
      !afterHide.payload?.data?.some((row) => row.code === code),
      "hidden rows disappear from the public list",
    );

    const adminList = await call("/part-of-speech/admin?locale=en", {
      cookie: adminCookie,
    });
    const hidden = adminList.payload?.data?.find((row) => row.code === code);
    assert(Boolean(hidden), "admins still see hidden rows");
    assert(hidden?.isActive === false, "the hidden state is visible to admins");

    const restore = await call(`/part-of-speech/${code}/restore`, {
      method: "POST",
      cookie: adminCookie,
    });
    assert(restore.status === 200, "admin restores a hidden part of speech");
    assert(restore.payload?.data?.isActive === true, "the row is active again");

    const restoredList = await call("/part-of-speech?locale=en");
    assert(
      restoredList.payload?.data?.some((row) => row.code === code),
      "restored rows are selectable again",
    );

    const word = await call("/words/w-001?locale=es");
    assert(
      word.payload?.data?.partOfSpeechLabel === "numeral",
      "word responses include the localized part-of-speech label",
    );
  } finally {
    if (created) {
      await prisma.auditLog
        .deleteMany({ where: { entityType: "partOfSpeech", entityId: code } })
        .catch(() => undefined);
      await prisma.partOfSpeech
        .delete({ where: { code } })
        .catch(() => undefined);
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
