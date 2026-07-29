-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailOnFollow" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailOnLike" BOOLEAN NOT NULL DEFAULT false;
