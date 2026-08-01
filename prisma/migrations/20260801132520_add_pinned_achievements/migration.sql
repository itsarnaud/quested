-- CreateTable
CREATE TABLE "PinnedAchievement" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,

    CONSTRAINT "PinnedAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PinnedAchievement_userId_idx" ON "PinnedAchievement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PinnedAchievement_userId_achievementId_key" ON "PinnedAchievement"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "PinnedAchievement_userId_position_key" ON "PinnedAchievement"("userId", "position");

-- AddForeignKey
ALTER TABLE "PinnedAchievement" ADD CONSTRAINT "PinnedAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinnedAchievement" ADD CONSTRAINT "PinnedAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
