import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { LANGUAGES, WORDS } from "./seed-data.js";

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

function seedAccount(prefix) {
  return {
    email: process.env[`SEED_${prefix}_EMAIL`],
    username: process.env[`SEED_${prefix}_USERNAME`],
    password: process.env[`SEED_${prefix}_PASSWORD`],
    role: prefix.toLowerCase(),
  };
}

async function upsertSeedUser({ email, username, password, role }) {
  if (!email || !username || !password) {
    console.warn(`[seed] Skipping ${role}: missing SEED_${role.toUpperCase()} variables.`);
    return null;
  }

  const normalisedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalisedEmail } });

  if (existing) {
    if (existing.role !== role) {
      console.warn(
        `[seed] ${normalisedEmail} already exists with role "${existing.role}" (expected "${role}"). Left unchanged.`,
      );
    } else {
      console.log(`[seed] = ${role} ${normalisedEmail} already exists`);
    }
    return existing;
  }

  const user = await prisma.user.create({
    data: {
      email: normalisedEmail,
      username,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      provider: "local",
      role,
    },
  });

  console.log(`[seed] + ${role} ${normalisedEmail} / ${password}`);
  return user;
}

async function main() {
  // Languages -------------------------------------------------------------
  for (const language of LANGUAGES) {
    await prisma.language.upsert({
      where: { id: language.id },
      update: {},
      create: {
        id: language.id,
        name: language.name,
        autonym: language.autonym,
        region: language.region,
        speakers: language.speakers,
        words: language.words,
        status: language.status,
        accent: language.accent,
        reviewState: "approved",
        verified: false,
      },
    });
  }
  console.log(`[seed] = ${LANGUAGES.length} languages`);

  // Words -----------------------------------------------------------------
  for (const word of WORDS) {
    await prisma.word.upsert({
      where: { id: word.id },
      update: {},
      create: {
        id: word.id,
        languageId: word.languageId,
        word: word.word,
        translation: word.translation,
        pronunciation: word.pronunciation ?? null,
        partOfSpeech: word.partOfSpeech ?? null,
        usage: word.usage ?? null,
        verified: Boolean(word.verified),
        reviewState: "approved",
      },
    });
  }
  console.log(`[seed] = ${WORDS.length} words`);

  // Accounts --------------------------------------------------------------
  const admin = await upsertSeedUser(seedAccount("ADMIN"));
  await upsertSeedUser(seedAccount("REVIEWER"));
  await upsertSeedUser(seedAccount("CONTRIBUTOR"));

  // One audit marker per fixture import. Keeps re-running the seed quiet.
  const alreadyLogged = await prisma.auditLog.findFirst({
    where: {
      entityType: "system",
      entityId: "fixture-seed",
      action: "seeded",
    },
  });

  if (!alreadyLogged) {
    await prisma.auditLog.create({
      data: {
        entityType: "system",
        entityId: "fixture-seed",
        action: "seeded",
        actorId: admin?.id ?? null,
        actorEmail: admin?.email ?? null,
        actorRole: admin?.role ?? null,
        reason: "Imported the frontend placeholder corpus as approved fixtures.",
        snapshot: JSON.stringify({
          languages: LANGUAGES.length,
          words: WORDS.length,
        }),
      },
    });
  }

  console.log("[seed] Done.");
}

main()
  .catch((error) => {
    console.error("[seed] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
