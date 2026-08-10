import { prisma } from "@/lib/prisma";
import { getXboxTitleAchievements, XboxBudgetExhaustedError } from "@/server/xbox/client";

// Unlike Steam/PSN, there's no separate "definitions" vs "earned status"
// call to split and cache globally — OpenXBL's per-title endpoint always
// returns the full achievement list (locked and unlocked, with rarity) in
// one response, so every user's sync re-fetches it regardless of whether
// another user already has this game's achievements. Upsert throughout
// rather than the Steam/PSN "skip if already exists" pattern, since a
// fresher rarity/description is a fine side effect of that extra cost.
export async function syncXboxAchievementsForTitle(
  userId: string,
  xuid: string,
  gameId: string,
  titleId: string,
): Promise<number> {
  const achievements = await getXboxTitleAchievements(xuid, titleId);
  if (achievements.length === 0) return 0;

  let unlocked = 0;
  for (const a of achievements) {
    const iconUrl = a.mediaAssets.find((m) => m.type === "Icon")?.url ?? "";
    const achievement = await prisma.achievement.upsert({
      where: { gameId_source_apiName: { gameId, source: "XBOX", apiName: a.id } },
      update: {
        displayName: a.name,
        description: a.description,
        iconUrl,
        iconGrayUrl: iconUrl,
        globalUnlockedPercent: a.rarity?.currentPercentage ?? null,
      },
      create: {
        gameId,
        source: "XBOX",
        apiName: a.id,
        displayName: a.name,
        description: a.description,
        iconUrl,
        iconGrayUrl: iconUrl,
        globalUnlockedPercent: a.rarity?.currentPercentage ?? null,
      },
    });

    if (a.progressState !== "Achieved") continue;

    // "0001-01-01..." is OpenXBL's zero-value placeholder for "never
    // unlocked" — only a real timestamp means an actual unlock date.
    const unlockedAt = a.progression.timeUnlocked.startsWith("0001") ? null : new Date(a.progression.timeUnlocked);
    await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
      update: {},
      create: { userId, achievementId: achievement.id, unlockedAt },
    });
    unlocked++;
  }

  // Xbox has no Platinum-style single trophy — same reasoning as Steam's
  // 100%-unlocked override (src/server/steam/achievements.ts).
  if (unlocked === achievements.length) {
    await prisma.log.updateMany({
      where: { userId, gameId, status: { not: "COMPLETED" } },
      data: { status: "COMPLETED" },
    });
  }

  return unlocked;
}

export async function syncXboxAchievementsPage(userId: string, xuid: string, offset: number, limit: number) {
  const linkedGames = await prisma.log.findMany({
    where: { userId, game: { externalIds: { some: { source: "XBOX" } } } },
    select: {
      game: {
        select: { id: true, externalIds: { where: { source: "XBOX" }, select: { sourceId: true } } },
      },
    },
    orderBy: { gameId: "asc" },
  });

  const total = linkedGames.length;
  const page = linkedGames.slice(offset, offset + limit);

  // Sequential, not Promise.allSettled like Steam/PSN — those each have
  // their own generous per-user budget, but Xbox's 150/hour is shared by
  // every user of the app at once. Running a page in parallel would let
  // several requests race past checkXboxBudget before any of them actually
  // consumed it, blowing straight through the cap instead of stopping
  // cleanly at the exact game where it ran out.
  let achievementsUnlocked = 0;
  let processed = 0;
  let pausedUntil: number | null = null;

  for (const { game } of page) {
    const titleId = game.externalIds[0]?.sourceId;
    if (!titleId) {
      processed++;
      continue;
    }
    try {
      achievementsUnlocked += await syncXboxAchievementsForTitle(userId, xuid, game.id, titleId);
      processed++;
    } catch (e) {
      if (e instanceof XboxBudgetExhaustedError) {
        pausedUntil = e.resetAt;
        break;
      }
      console.error("Xbox achievement sync failed for one game:", e);
      processed++;
    }
  }

  return {
    gamesProcessed: processed,
    achievementsUnlocked,
    done: pausedUntil === null && offset + processed >= total,
    pausedUntil,
  };
}
