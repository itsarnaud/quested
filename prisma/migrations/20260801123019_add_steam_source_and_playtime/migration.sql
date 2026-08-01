-- AlterEnum
ALTER TYPE "GameSource" ADD VALUE 'STEAM';

-- AlterTable
ALTER TABLE "Log" ADD COLUMN     "minutesPlayed" INTEGER;
