-- CreateTable
CREATE TABLE "PartOfSpeechTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partOfSpeechCode" TEXT NOT NULL,
    "localeCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "PartOfSpeechTranslation_partOfSpeechCode_fkey" FOREIGN KEY ("partOfSpeechCode") REFERENCES "PartOfSpeech" ("code") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartOfSpeechTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PartOfSpeech" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_PartOfSpeech" ("code", "label") SELECT "code", "label" FROM "PartOfSpeech";
DROP TABLE "PartOfSpeech";
ALTER TABLE "new_PartOfSpeech" RENAME TO "PartOfSpeech";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PartOfSpeechTranslation_localeCode_idx" ON "PartOfSpeechTranslation"("localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "PartOfSpeechTranslation_partOfSpeechCode_localeCode_key" ON "PartOfSpeechTranslation"("partOfSpeechCode", "localeCode");
