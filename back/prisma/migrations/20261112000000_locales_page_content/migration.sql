-- Add a Locale lookup, admin-editable page copy, and per-sense translations.
--
-- Existing English glosses/usages move into SenseTranslation rows for the
-- default `en` locale, so the old `Sense.gloss`/`Sense.usage` columns can be
-- removed without losing any data.

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- ---------------------------------------------------------------------------
-- Locale lookup
-- ---------------------------------------------------------------------------

CREATE TABLE "Locale" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0
);

INSERT INTO "Locale" ("code", "label", "isActive", "isDefault", "position") VALUES
    ('en', 'English', true, true, 0),
    ('es', 'Español', true, false, 1);

-- ---------------------------------------------------------------------------
-- Editable page copy (database overrides; JSON files hold the defaults)
-- ---------------------------------------------------------------------------

CREATE TABLE "PageContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "localeCode" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    CONSTRAINT "PageContent_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale" ("code") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PageContent_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PageContent_key_localeCode_key" ON "PageContent"("key", "localeCode");
CREATE INDEX "PageContent_localeCode_idx" ON "PageContent"("localeCode");
CREATE INDEX "PageContent_updatedById_idx" ON "PageContent"("updatedById");

-- ---------------------------------------------------------------------------
-- Sense translations
-- ---------------------------------------------------------------------------

CREATE TABLE "new_Sense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wordId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    CONSTRAINT "Sense_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Sense" ("id", "wordId", "position", "createdAt", "updatedAt")
SELECT "id", "wordId", "position", "createdAt", "updatedAt" FROM "Sense";

ALTER TABLE "Sense" RENAME TO "old_Sense";
ALTER TABLE "new_Sense" RENAME TO "Sense";

CREATE TABLE "SenseTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senseId" TEXT NOT NULL,
    "localeCode" TEXT NOT NULL,
    "gloss" TEXT NOT NULL,
    "usage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    CONSTRAINT "SenseTranslation_senseId_fkey" FOREIGN KEY ("senseId") REFERENCES "Sense" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SenseTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "SenseTranslation" (
    "id", "senseId", "localeCode", "gloss", "usage", "createdAt", "updatedAt"
)
SELECT
    'st_' || "id",
    "id",
    'en',
    "gloss",
    "usage",
    "createdAt",
    "updatedAt"
FROM "old_Sense";

DROP TABLE "old_Sense";

CREATE UNIQUE INDEX "Sense_wordId_position_key" ON "Sense"("wordId", "position");
CREATE INDEX "Sense_wordId_idx" ON "Sense"("wordId");

CREATE UNIQUE INDEX "SenseTranslation_senseId_localeCode_key" ON "SenseTranslation"("senseId", "localeCode");
CREATE INDEX "SenseTranslation_senseId_idx" ON "SenseTranslation"("senseId");
CREATE INDEX "SenseTranslation_localeCode_idx" ON "SenseTranslation"("localeCode");
CREATE INDEX "SenseTranslation_gloss_idx" ON "SenseTranslation"("gloss");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
