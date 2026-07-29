-- CreateEnum
CREATE TYPE "Badge" AS ENUM ('FOUNDER', 'EARLY_ADOPTER', 'BETA_TESTER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "badges" "Badge"[] DEFAULT ARRAY[]::"Badge"[];
