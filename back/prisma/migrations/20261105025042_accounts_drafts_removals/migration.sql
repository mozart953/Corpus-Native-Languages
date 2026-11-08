-- AlterTable
ALTER TABLE "Language" ADD COLUMN "removalRequestReason" TEXT;
ALTER TABLE "Language" ADD COLUMN "removalRequestedAt" DATETIME;
ALTER TABLE "Language" ADD COLUMN "removalRequestedById" TEXT;

-- AlterTable
ALTER TABLE "Word" ADD COLUMN "removalRequestReason" TEXT;
ALTER TABLE "Word" ADD COLUMN "removalRequestedAt" DATETIME;
ALTER TABLE "Word" ADD COLUMN "removalRequestedById" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'local',
    "providerId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'contributor',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "statusReason" TEXT,
    "statusChangedAt" DATETIME,
    "approvedAt" DATETIME,
    "approvedById" TEXT,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "lastLoginAt", "passwordHash", "provider", "providerId", "role", "updatedAt", "username") SELECT "createdAt", "email", "id", "lastLoginAt", "passwordHash", "provider", "providerId", "role", "updatedAt", "username" FROM "User";
-- Accounts that existed before approval workflows were introduced are active.
UPDATE "new_User" SET "status" = 'active', "statusChangedAt" = CURRENT_TIMESTAMP, "approvedAt" = CURRENT_TIMESTAMP;
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_provider_idx" ON "User"("provider");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE UNIQUE INDEX "User_provider_providerId_key" ON "User"("provider", "providerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Language_removalRequestedAt_idx" ON "Language"("removalRequestedAt");

-- CreateIndex
CREATE INDEX "Word_removalRequestedAt_idx" ON "Word"("removalRequestedAt");
