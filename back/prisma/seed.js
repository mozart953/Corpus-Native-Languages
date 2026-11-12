import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { LANGUAGES, WORDS } from "./seed-data.js";
import { normalizePartOfSpeechCode } from "../src/models/word.model.js";

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

const REVIEW_STATES = [
  { code: "draft", label: "Draft" },
  { code: "pending", label: "Pending review" },
  { code: "reviewer_approved", label: "Reviewer approved" },
  { code: "approved", label: "Approved" },
  { code: "rejected", label: "Rejected" },
  { code: "removed", label: "Removed" },
];

const LANGUAGE_STATUSES = [
  { code: "active", label: "Active" },
  { code: "endangered", label: "Endangered" },
  { code: "critically-endangered", label: "Critically endangered" },
];

const ROLES = [
  { code: "contributor", label: "Contributor" },
  { code: "reviewer", label: "Reviewer" },
  { code: "admin", label: "Administrator" },
];

const USER_STATUSES = [
  { code: "pending", label: "Pending approval" },
  { code: "active", label: "Active" },
  { code: "rejected", label: "Rejected" },
  { code: "deactivated", label: "Deactivated" },
];

const PROVIDERS = [
  { code: "local", label: "Local" },
  { code: "google", label: "Google" },
];

const REMOVAL_STATUSES = [
  { code: "pending", label: "Pending" },
  { code: "cancelled", label: "Cancelled" },
  { code: "completed", label: "Completed" },
];

const LOCALES = [
  { code: "en", label: "English", isActive: true, isDefault: true, position: 0 },
  { code: "es", label: "Español", isActive: true, isDefault: false, position: 1 },
];

const COMMON_PARTS_OF_SPEECH = [
  { code: "noun", label: "noun" },
  { code: "verb", label: "verb" },
  { code: "adjective", label: "adjective" },
  { code: "numeral", label: "numeral" },
  { code: "pronoun", label: "pronoun" },
  { code: "adverb", label: "adverb" },
  { code: "phrase", label: "phrase" },
  { code: "greeting", label: "greeting" },
];

function seedAccount(prefix) {
  return {
    email: process.env[`SEED_${prefix}_EMAIL`],
    username: process.env[`SEED_${prefix}_USERNAME`],
    password: process.env[`SEED_${prefix}_PASSWORD`],
    role: prefix.toLowerCase(),
  };
}

function splitRegions(value) {
  return String(value ?? "")
    .split(",")
    .map((region) => region.trim())
    .filter(Boolean);
}

function regionWrites(region) {
  return splitRegions(region).map((name, position) => ({
    position,
    region: {
      connectOrCreate: {
        where: { name },
        create: { name },
      },
    },
  }));
}

async function upsertLookup(model, rows) {
  for (const row of rows) {
    await prisma[model].upsert({
      where: { code: row.code },
      update: { label: row.label },
      create: row,
    });
  }
}

async function seedLookups() {
  await upsertLookup("reviewState", REVIEW_STATES);
  await upsertLookup("languageStatus", LANGUAGE_STATUSES);
  await upsertLookup("role", ROLES);
  await upsertLookup("userStatus", USER_STATUSES);
  await upsertLookup("provider", PROVIDERS);
  await upsertLookup("removalStatus", REMOVAL_STATUSES);

  for (const locale of LOCALES) {
    await prisma.locale.upsert({
      where: { code: locale.code },
      update: {
        label: locale.label,
        isActive: locale.isActive,
        isDefault: locale.isDefault,
        position: locale.position,
      },
      create: locale,
    });
  }

  const partsOfSpeech = new Map(
    COMMON_PARTS_OF_SPEECH.map((row) => [row.code, row]),
  );
  for (const word of WORDS) {
    const code = normalizePartOfSpeechCode(word.partOfSpeech);
    if (code && !partsOfSpeech.has(code)) {
      partsOfSpeech.set(code, { code, label: String(word.partOfSpeech).trim() });
    }
  }
  await upsertLookup("partOfSpeech", [...partsOfSpeech.values()]);
}

async function upsertSeedUser({ email, username, password, role }) {
  if (!email || !username || !password) {
    console.warn(
      `[seed] Skipping ${role}: missing SEED_${role.toUpperCase()} variables.`,
    );
    return null;
  }

  const normalisedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email: normalisedEmail },
  });

  if (existing) {
    if (existing.roleCode !== role) {
      console.warn(
        `[seed] ${normalisedEmail} already exists with role "${existing.roleCode}" (expected "${role}"). Left unchanged.`,
      );
    }

    // Seed accounts must be usable after every reseed, even if the database
    // predates the approval workflow.
    if (existing.statusCode !== "active" || !existing.approvedAt) {
      const repaired = await prisma.user.update({
        where: { id: existing.id },
        data: {
          statusCode: "active",
          statusReason: null,
          statusChangedAt: new Date(),
          approvedAt: existing.approvedAt ?? new Date(),
        },
      });
      console.log(`[seed] ~ reactivated ${role} ${normalisedEmail}`);
      return repaired;
    }

    console.log(`[seed] = ${role} ${normalisedEmail} already exists`);
    return existing;
  }

  const now = new Date();
  const user = await prisma.user.create({
    data: {
      email: normalisedEmail,
      username,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      providerCode: "local",
      roleCode: role,
      statusCode: "active",
      statusChangedAt: now,
      approvedAt: now,
    },
  });

  console.log(`[seed] + ${role} ${normalisedEmail} / ${password}`);
  return user;
}

async function seedLanguages() {
  for (const language of LANGUAGES) {
    await prisma.language.upsert({
      where: { id: language.id },
      update: {},
      create: {
        id: language.id,
        name: language.name,
        autonym: language.autonym,
        speakers: language.speakers,
        accent: language.accent,
        statusCode: language.status,
        reviewStateCode: "approved",
        regions: { create: regionWrites(language.region) },
      },
    });
  }
  console.log(`[seed] = ${LANGUAGES.length} languages`);
}

async function seedWords() {
  for (const word of WORDS) {
    await prisma.word.upsert({
      where: { id: word.id },
      update: {},
      create: {
        id: word.id,
        languageId: word.languageId,
        word: word.word,
        pronunciation: word.pronunciation ?? null,
        partOfSpeechCode: normalizePartOfSpeechCode(word.partOfSpeech),
        reviewStateCode: "approved",
        senses: {
          create: [
            {
              position: 0,
              translations: {
                create: [
                  {
                    localeCode: "en",
                    gloss: word.translation,
                    usage: word.usage ?? null,
                  },
                ],
              },
            },
          ],
        },
      },
    });
  }
  console.log(`[seed] = ${WORDS.length} words`);
}

/**
 * Keep fixture words readable after the translation split. Fresh databases get
 * their English row in seedWords; this repairs a database that was seeded
 * before the SenseTranslation table existed.
 */
async function seedWordTranslations() {
  for (const word of WORDS) {
    const existing = await prisma.word.findUnique({
      where: { id: word.id },
      include: {
        senses: {
          orderBy: { position: "asc" },
          include: { translations: true },
        },
      },
    });

    if (!existing) continue;

    const primary = existing.senses[0];
    if (!primary) {
      await prisma.sense.create({
        data: {
          wordId: existing.id,
          position: 0,
          translations: {
            create: [
              {
                localeCode: "en",
                gloss: word.translation,
                usage: word.usage ?? null,
              },
            ],
          },
        },
      });
      continue;
    }

    if (!primary.translations.some((row) => row.localeCode === "en")) {
      await prisma.senseTranslation.create({
        data: {
          senseId: primary.id,
          localeCode: "en",
          gloss: word.translation,
          usage: word.usage ?? null,
        },
      });
    }
  }
  console.log(`[seed] = English sense translations for ${WORDS.length} words`);
}

/**
 * Give every fixture an initial review decision so the derived `reviewedAt`
 * field is populated, while leaving decisions created by the migration alone.
 */
async function seedReviewDecisions(admin) {
  const entities = [
    ...LANGUAGES.map((language) => ({
      entityType: "language",
      entityId: language.id,
    })),
    ...WORDS.map((word) => ({ entityType: "word", entityId: word.id })),
  ];

  for (const entity of entities) {
    const existing = await prisma.reviewDecision.findFirst({
      where: entity,
    });
    if (!existing) {
      await prisma.reviewDecision.create({
        data: {
          ...entity,
          stateCode: "approved",
          reviewerId: admin?.id ?? null,
        },
      });
    }
  }
}

async function main() {
  await seedLookups();

  const admin = await upsertSeedUser(seedAccount("ADMIN"));
  await upsertSeedUser(seedAccount("REVIEWER"));
  await upsertSeedUser(seedAccount("CONTRIBUTOR"));

  await seedLanguages();
  await seedWords();
  await seedWordTranslations();
  await seedReviewDecisions(admin);

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
        actorRole: admin?.roleCode ?? null,
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
