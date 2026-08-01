-- AlterTable
ALTER TABLE "User" ADD COLUMN     "showDiscordOnProfile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showSteamOnProfile" BOOLEAN NOT NULL DEFAULT false;
