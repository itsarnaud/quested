-- AlterTable: add nullable first so existing rows can be backfilled
ALTER TABLE "Achievement" ADD COLUMN "source" "GameSource";

-- Backfill: PSN trophyIds are bare integers ("3", "42"...), Steam apiNames
-- never are (e.g. "TheFool", "ACH_WIN_GAME") — verified against real synced
-- data before writing this migration.
UPDATE "Achievement" SET "source" = 'PSN' WHERE "apiName" ~ '^[0-9]+$';
UPDATE "Achievement" SET "source" = 'STEAM' WHERE "source" IS NULL;

-- AlterTable: now safe to enforce NOT NULL
ALTER TABLE "Achievement" ALTER COLUMN "source" SET NOT NULL;

-- DropIndex
DROP INDEX "Achievement_gameId_apiName_key";

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_gameId_source_apiName_key" ON "Achievement"("gameId", "source", "apiName");
