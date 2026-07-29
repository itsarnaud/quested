-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "developers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "releaseDate" TIMESTAMP(3);
