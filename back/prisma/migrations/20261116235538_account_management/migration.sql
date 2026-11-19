/*
  Warnings:

  - Added the required column `usernameKey` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "AccountRequestStatus" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "AccountChangeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requestUsername" BOOLEAN NOT NULL DEFAULT false,
    "requestEmail" BOOLEAN NOT NULL DEFAULT false,
    "requestPassword" BOOLEAN NOT NULL DEFAULT false,
    "statusCode" TEXT NOT NULL DEFAULT 'pending',
    "resolvedById" TEXT,
    "resolvedAt" DATETIME,
    "resolutionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccountChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AccountChangeRequest_statusCode_fkey" FOREIGN KEY ("statusCode") REFERENCES "AccountRequestStatus" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AccountChangeRequest_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "usernameKey" TEXT NOT NULL,
    "usernameChangedAt" DATETIME,
    "emailChangedAt" DATETIME,
    "passwordChangedAt" DATETIME,
    "emailVerifiedAt" DATETIME,
    "pendingEmail" TEXT,
    "passwordHash" TEXT,
    "providerCode" TEXT NOT NULL DEFAULT 'local',
    "providerId" TEXT,
    "roleCode" TEXT NOT NULL DEFAULT 'contributor',
    "statusCode" TEXT NOT NULL DEFAULT 'pending',
    "statusReason" TEXT,
    "statusChangedAt" DATETIME,
    "approvedAt" DATETIME,
    "approvedById" TEXT,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_providerCode_fkey" FOREIGN KEY ("providerCode") REFERENCES "Provider" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "User_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "Role" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "User_statusCode_fkey" FOREIGN KEY ("statusCode") REFERENCES "UserStatus" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "User_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("approvedAt", "approvedById", "createdAt", "email", "id", "lastLoginAt", "passwordHash", "providerCode", "providerId", "roleCode", "statusChangedAt", "statusCode", "statusReason", "updatedAt", "username", "usernameKey") SELECT "approvedAt", "approvedById", "createdAt", "email", "id", "lastLoginAt", "passwordHash", "providerCode", "providerId", "roleCode", "statusChangedAt", "statusCode", "statusReason", "updatedAt", "username", lower(trim("username")) FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_usernameKey_key" ON "User"("usernameKey");
CREATE INDEX "User_roleCode_idx" ON "User"("roleCode");
CREATE INDEX "User_providerCode_idx" ON "User"("providerCode");
CREATE INDEX "User_statusCode_idx" ON "User"("statusCode");
CREATE UNIQUE INDEX "User_providerCode_providerId_key" ON "User"("providerCode", "providerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AccountChangeRequest_userId_statusCode_idx" ON "AccountChangeRequest"("userId", "statusCode");

-- CreateIndex
CREATE INDEX "AccountChangeRequest_statusCode_createdAt_idx" ON "AccountChangeRequest"("statusCode", "createdAt");

-- CreateIndex
CREATE INDEX "AccountChangeRequest_resolvedById_idx" ON "AccountChangeRequest"("resolvedById");
