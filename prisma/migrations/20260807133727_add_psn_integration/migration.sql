-- AlterEnum
ALTER TYPE "GameSource" ADD VALUE 'PSN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "showPsnOnProfile" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PsnServiceToken" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "refreshTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PsnServiceToken_pkey" PRIMARY KEY ("id")
);
