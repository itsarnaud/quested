-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[];
