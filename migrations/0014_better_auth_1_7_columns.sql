-- better-auth 1.7 schema additions (it refuses to start when these are missing).
-- organization plugin: invitation.createdAt
ALTER TABLE "invitation" ADD COLUMN "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- @better-auth/api-key: keys are now scoped by configId and owned via referenceId
-- (referenceId replaces the old userId ownership; backfill from userId).
ALTER TABLE "apikey" ADD COLUMN "configId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "apikey" ADD COLUMN "referenceId" TEXT;
UPDATE "apikey" SET "referenceId" = "userId" WHERE "referenceId" IS NULL AND "userId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "apikey_referenceId_idx" ON "apikey"("referenceId");
