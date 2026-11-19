-- Normalize the corpus to third normal form while preserving existing rows.
--
-- Strategy: build the new tables as `new_*`, copy and transform the old rows
-- into them (including the data that moves into Region, Sense, ReviewDecision
-- and RemovalRequest), then swap the tables. Foreign keys are disabled while
-- the old tables are replaced so no data is lost to a cascade.

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- ---------------------------------------------------------------------------
-- Lookup tables
-- ---------------------------------------------------------------------------

CREATE TABLE "ReviewState" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL
);

CREATE TABLE "LanguageStatus" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL
);

CREATE TABLE "PartOfSpeech" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL
);

CREATE TABLE "Role" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL
);

CREATE TABLE "UserStatus" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL
);

CREATE TABLE "Provider" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL
);

CREATE TABLE "RemovalStatus" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL
);

INSERT INTO "ReviewState" ("code", "label") VALUES
    ('draft', 'Draft'),
    ('pending', 'Pending review'),
    ('reviewer_approved', 'Reviewer approved'),
    ('approved', 'Approved'),
    ('rejected', 'Rejected'),
    ('removed', 'Removed');

INSERT INTO "LanguageStatus" ("code", "label") VALUES
    ('active', 'Active'),
    ('endangered', 'Endangered'),
    ('critically-endangered', 'Critically endangered');

INSERT INTO "Role" ("code", "label") VALUES
    ('contributor', 'Contributor'),
    ('reviewer', 'Reviewer'),
    ('admin', 'Administrator');

INSERT INTO "UserStatus" ("code", "label") VALUES
    ('pending', 'Pending approval'),
    ('active', 'Active'),
    ('rejected', 'Rejected'),
    ('deactivated', 'Deactivated');

INSERT INTO "Provider" ("code", "label") VALUES
    ('local', 'Local'),
    ('google', 'Google');

INSERT INTO "RemovalStatus" ("code", "label") VALUES
    ('pending', 'Pending'),
    ('cancelled', 'Cancelled'),
    ('completed', 'Completed');

INSERT OR IGNORE INTO "PartOfSpeech" ("code", "label") VALUES
    ('noun', 'noun'),
    ('verb', 'verb'),
    ('adjective', 'adjective'),
    ('numeral', 'numeral'),
    ('pronoun', 'pronoun'),
    ('adverb', 'adverb'),
    ('phrase', 'phrase'),
    ('greeting', 'greeting');

INSERT OR IGNORE INTO "PartOfSpeech" ("code", "label")
SELECT DISTINCT
    lower(trim(replace(replace(replace(trim("partOfSpeech"), ' ', '-'), '/', '-'), '.', ''))),
    trim("partOfSpeech")
FROM "Word"
WHERE "partOfSpeech" IS NOT NULL AND trim("partOfSpeech") <> '';

-- ---------------------------------------------------------------------------
-- Regions (Language.region -> Region + LanguageRegion)
-- ---------------------------------------------------------------------------

CREATE TABLE "Region" (
    "name" TEXT NOT NULL PRIMARY KEY
);

INSERT OR IGNORE INTO "Region" ("name")
SELECT DISTINCT trim(j.value)
FROM "Language" l, json_each('["' || replace(replace(l.region, '"', ''), ',', '","') || '"]') j
WHERE trim(j.value) <> '';

CREATE TABLE "LanguageRegion" (
    "languageId" TEXT NOT NULL,
    "regionName" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("languageId", "regionName"),
    CONSTRAINT "LanguageRegion_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LanguageRegion_regionName_fkey" FOREIGN KEY ("regionName") REFERENCES "Region" ("name") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT OR IGNORE INTO "LanguageRegion" ("languageId", "regionName", "position")
SELECT l.id, trim(j.value), CAST(j.key AS INTEGER)
FROM "Language" l, json_each('["' || replace(replace(l.region, '"', ''), ',', '","') || '"]') j
WHERE trim(j.value) <> '';

-- ---------------------------------------------------------------------------
-- New content and account tables
-- ---------------------------------------------------------------------------

CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
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

INSERT INTO "new_User" (
    "id", "email", "username", "passwordHash", "providerCode", "providerId",
    "roleCode", "statusCode", "statusReason", "statusChangedAt", "approvedAt",
    "approvedById", "lastLoginAt", "createdAt", "updatedAt"
)
SELECT
    u."id",
    u."email",
    u."username",
    u."passwordHash",
    CASE WHEN EXISTS (SELECT 1 FROM "Provider" p WHERE p."code" = u."provider") THEN u."provider" ELSE 'local' END,
    u."providerId",
    CASE WHEN EXISTS (SELECT 1 FROM "Role" r WHERE r."code" = u."role") THEN u."role" ELSE 'contributor' END,
    CASE WHEN EXISTS (SELECT 1 FROM "UserStatus" s WHERE s."code" = u."status") THEN u."status" ELSE 'pending' END,
    u."statusReason",
    u."statusChangedAt",
    u."approvedAt",
    CASE WHEN u."approvedById" IS NOT NULL AND EXISTS (SELECT 1 FROM "User" a WHERE a."id" = u."approvedById") THEN u."approvedById" ELSE NULL END,
    u."lastLoginAt",
    u."createdAt",
    u."updatedAt"
FROM "User" u;

CREATE TABLE "new_Language" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "autonym" TEXT NOT NULL,
    "speakers" INTEGER NOT NULL,
    "accent" TEXT NOT NULL,
    "statusCode" TEXT NOT NULL DEFAULT 'active',
    "reviewStateCode" TEXT NOT NULL DEFAULT 'pending',
    "createdById" TEXT,
    "deletedAt" DATETIME,
    "deletedById" TEXT,
    "deletionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    CONSTRAINT "Language_statusCode_fkey" FOREIGN KEY ("statusCode") REFERENCES "LanguageStatus" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Language_reviewStateCode_fkey" FOREIGN KEY ("reviewStateCode") REFERENCES "ReviewState" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Language_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Language_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Language" (
    "id", "name", "autonym", "speakers", "accent", "statusCode",
    "reviewStateCode", "createdById", "deletedAt", "deletedById",
    "deletionReason", "createdAt", "updatedAt"
)
SELECT
    l."id",
    l."name",
    l."autonym",
    l."speakers",
    l."accent",
    CASE WHEN EXISTS (SELECT 1 FROM "LanguageStatus" s WHERE s."code" = l."status") THEN l."status" ELSE 'active' END,
    CASE WHEN EXISTS (SELECT 1 FROM "ReviewState" r WHERE r."code" = l."reviewState") THEN l."reviewState" ELSE 'pending' END,
    CASE WHEN l."createdById" IS NOT NULL AND EXISTS (SELECT 1 FROM "User" u WHERE u."id" = l."createdById") THEN l."createdById" ELSE NULL END,
    l."deletedAt",
    CASE WHEN l."deletedById" IS NOT NULL AND EXISTS (SELECT 1 FROM "User" u WHERE u."id" = l."deletedById") THEN l."deletedById" ELSE NULL END,
    l."deletionReason",
    l."createdAt",
    l."updatedAt"
FROM "Language" l;

CREATE TABLE "new_Word" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "languageId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "pronunciation" TEXT,
    "partOfSpeechCode" TEXT,
    "reviewStateCode" TEXT NOT NULL DEFAULT 'pending',
    "createdById" TEXT,
    "deletedAt" DATETIME,
    "deletedById" TEXT,
    "deletionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    CONSTRAINT "Word_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Word_partOfSpeechCode_fkey" FOREIGN KEY ("partOfSpeechCode") REFERENCES "PartOfSpeech" ("code") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Word_reviewStateCode_fkey" FOREIGN KEY ("reviewStateCode") REFERENCES "ReviewState" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Word_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Word_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Word" (
    "id", "languageId", "word", "pronunciation", "partOfSpeechCode",
    "reviewStateCode", "createdById", "deletedAt", "deletedById",
    "deletionReason", "createdAt", "updatedAt"
)
SELECT
    w."id",
    w."languageId",
    w."word",
    w."pronunciation",
    (SELECT p."code" FROM "PartOfSpeech" p WHERE p."label" = trim(w."partOfSpeech") LIMIT 1),
    CASE WHEN EXISTS (SELECT 1 FROM "ReviewState" r WHERE r."code" = w."reviewState") THEN w."reviewState" ELSE 'pending' END,
    CASE WHEN w."createdById" IS NOT NULL AND EXISTS (SELECT 1 FROM "User" u WHERE u."id" = w."createdById") THEN w."createdById" ELSE NULL END,
    w."deletedAt",
    CASE WHEN w."deletedById" IS NOT NULL AND EXISTS (SELECT 1 FROM "User" u WHERE u."id" = w."deletedById") THEN w."deletedById" ELSE NULL END,
    w."deletionReason",
    w."createdAt",
    w."updatedAt"
FROM "Word" w;

CREATE TABLE "new_Sense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wordId" TEXT NOT NULL,
    "gloss" TEXT NOT NULL,
    "usage" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    CONSTRAINT "Sense_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Sense" ("id", "wordId", "gloss", "usage", "position", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), w."id", w."translation", w."usage", 0, w."createdAt", w."updatedAt"
FROM "Word" w;

CREATE TABLE "new_ReviewDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "reviewerId" TEXT,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewDecision_stateCode_fkey" FOREIGN KEY ("stateCode") REFERENCES "ReviewState" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReviewDecision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_ReviewDecision" (
    "id", "entityType", "entityId", "stateCode", "reviewerId", "comment", "createdAt"
)
SELECT
    lower(hex(randomblob(16))),
    'language',
    l."id",
    CASE WHEN EXISTS (SELECT 1 FROM "ReviewState" r WHERE r."code" = l."reviewState") THEN l."reviewState" ELSE 'pending' END,
    CASE WHEN l."reviewedById" IS NOT NULL AND EXISTS (SELECT 1 FROM "User" u WHERE u."id" = l."reviewedById") THEN l."reviewedById" ELSE NULL END,
    l."rejectionReason",
    COALESCE(l."reviewedAt", l."updatedAt", CURRENT_TIMESTAMP)
FROM "Language" l;

INSERT INTO "new_ReviewDecision" (
    "id", "entityType", "entityId", "stateCode", "reviewerId", "comment", "createdAt"
)
SELECT
    lower(hex(randomblob(16))),
    'word',
    w."id",
    CASE WHEN EXISTS (SELECT 1 FROM "ReviewState" r WHERE r."code" = w."reviewState") THEN w."reviewState" ELSE 'pending' END,
    CASE WHEN w."reviewedById" IS NOT NULL AND EXISTS (SELECT 1 FROM "User" u WHERE u."id" = w."reviewedById") THEN w."reviewedById" ELSE NULL END,
    w."rejectionReason",
    COALESCE(w."reviewedAt", w."updatedAt", CURRENT_TIMESTAMP)
FROM "Word" w;

CREATE TABLE "new_RemovalRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT,
    "statusCode" TEXT NOT NULL DEFAULT 'pending',
    "requestedById" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    CONSTRAINT "RemovalRequest_statusCode_fkey" FOREIGN KEY ("statusCode") REFERENCES "RemovalStatus" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RemovalRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RemovalRequest_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_RemovalRequest" (
    "id", "entityType", "entityId", "reason", "statusCode",
    "requestedById", "resolvedById", "resolvedAt", "createdAt", "updatedAt"
)
SELECT
    lower(hex(randomblob(16))),
    'language',
    l."id",
    l."removalRequestReason",
    'pending',
    CASE WHEN l."removalRequestedById" IS NOT NULL AND EXISTS (SELECT 1 FROM "User" u WHERE u."id" = l."removalRequestedById") THEN l."removalRequestedById" ELSE NULL END,
    NULL,
    NULL,
    l."removalRequestedAt",
    l."removalRequestedAt"
FROM "Language" l
WHERE l."removalRequestedAt" IS NOT NULL;

INSERT INTO "new_RemovalRequest" (
    "id", "entityType", "entityId", "reason", "statusCode",
    "requestedById", "resolvedById", "resolvedAt", "createdAt", "updatedAt"
)
SELECT
    lower(hex(randomblob(16))),
    'word',
    w."id",
    w."removalRequestReason",
    'pending',
    CASE WHEN w."removalRequestedById" IS NOT NULL AND EXISTS (SELECT 1 FROM "User" u WHERE u."id" = w."removalRequestedById") THEN w."removalRequestedById" ELSE NULL END,
    NULL,
    NULL,
    w."removalRequestedAt",
    w."removalRequestedAt"
FROM "Word" w
WHERE w."removalRequestedAt" IS NOT NULL;

CREATE TABLE "new_SiteImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "alt" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    CONSTRAINT "SiteImage_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_SiteImage" (
    "id", "url", "fileName", "mimeType", "size", "alt", "updatedById", "createdAt", "updatedAt"
)
SELECT
    s."id",
    s."url",
    s."fileName",
    s."mimeType",
    s."size",
    s."alt",
    CASE WHEN s."updatedById" IS NOT NULL AND EXISTS (SELECT 1 FROM "User" u WHERE u."id" = s."updatedById") THEN s."updatedById" ELSE NULL END,
    s."createdAt",
    s."updatedAt"
FROM "SiteImage" s;

CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromState" TEXT,
    "toState" TEXT,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorRole" TEXT,
    "reason" TEXT,
    "snapshot" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_AuditLog" (
    "id", "entityType", "entityId", "action", "fromState", "toState",
    "actorId", "actorEmail", "actorRole", "reason", "snapshot", "createdAt"
)
SELECT
    a."id",
    a."entityType",
    a."entityId",
    a."action",
    a."fromState",
    a."toState",
    CASE WHEN a."actorId" IS NOT NULL AND EXISTS (SELECT 1 FROM "User" u WHERE u."id" = a."actorId") THEN a."actorId" ELSE NULL END,
    a."actorEmail",
    a."actorRole",
    a."reason",
    a."snapshot",
    a."createdAt"
FROM "AuditLog" a;

-- ---------------------------------------------------------------------------
-- Swap the tables
-- ---------------------------------------------------------------------------

DROP TABLE "AuditLog";
DROP TABLE "SiteImage";
DROP TABLE "Word";
DROP TABLE "Language";
DROP TABLE "User";

ALTER TABLE "new_User" RENAME TO "User";
ALTER TABLE "new_Language" RENAME TO "Language";
ALTER TABLE "new_Word" RENAME TO "Word";
ALTER TABLE "new_Sense" RENAME TO "Sense";
ALTER TABLE "new_ReviewDecision" RENAME TO "ReviewDecision";
ALTER TABLE "new_RemovalRequest" RENAME TO "RemovalRequest";
ALTER TABLE "new_SiteImage" RENAME TO "SiteImage";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_providerCode_providerId_key" ON "User"("providerCode", "providerId");
CREATE INDEX "User_roleCode_idx" ON "User"("roleCode");
CREATE INDEX "User_providerCode_idx" ON "User"("providerCode");
CREATE INDEX "User_statusCode_idx" ON "User"("statusCode");

CREATE INDEX "Language_reviewStateCode_idx" ON "Language"("reviewStateCode");
CREATE INDEX "Language_deletedAt_idx" ON "Language"("deletedAt");
CREATE INDEX "Language_name_idx" ON "Language"("name");
CREATE INDEX "Language_statusCode_idx" ON "Language"("statusCode");

CREATE INDEX "Word_languageId_idx" ON "Word"("languageId");
CREATE INDEX "Word_word_idx" ON "Word"("word");
CREATE INDEX "Word_reviewStateCode_idx" ON "Word"("reviewStateCode");
CREATE INDEX "Word_deletedAt_idx" ON "Word"("deletedAt");
CREATE INDEX "Word_partOfSpeechCode_idx" ON "Word"("partOfSpeechCode");

CREATE UNIQUE INDEX "Sense_wordId_position_key" ON "Sense"("wordId", "position");
CREATE INDEX "Sense_wordId_idx" ON "Sense"("wordId");
CREATE INDEX "Sense_gloss_idx" ON "Sense"("gloss");

CREATE INDEX "LanguageRegion_regionName_idx" ON "LanguageRegion"("regionName");

CREATE INDEX "ReviewDecision_entityType_entityId_createdAt_idx" ON "ReviewDecision"("entityType", "entityId", "createdAt");
CREATE INDEX "ReviewDecision_reviewerId_idx" ON "ReviewDecision"("reviewerId");
CREATE INDEX "ReviewDecision_stateCode_idx" ON "ReviewDecision"("stateCode");

CREATE INDEX "RemovalRequest_entityType_entityId_statusCode_idx" ON "RemovalRequest"("entityType", "entityId", "statusCode");
CREATE INDEX "RemovalRequest_requestedById_idx" ON "RemovalRequest"("requestedById");
CREATE INDEX "RemovalRequest_resolvedById_idx" ON "RemovalRequest"("resolvedById");
CREATE INDEX "RemovalRequest_statusCode_idx" ON "RemovalRequest"("statusCode");

CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
