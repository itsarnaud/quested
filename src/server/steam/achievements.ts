import { prisma } from "@/lib/prisma";
import {
  getSteamGameSchema,
  getSteamGlobalAchievementPercentages,
  getSteamPlayerAchievements,
} from "@/lib/steam-auth";

/**
 * Syncs one game's achievements for one user. The achievement schema
 * (names/descriptions/icons/global rarity) is game-level and only fetched
 * once ever per canonical Game — every later sync, by any user, reuses the
 * rows already in the `Achievement` table. Only the per-user unlock state
 * (`GetPlayerAchievements`) is fetched on every call.
 */
export async function syncAchievementsForGame(
  userId: string,
  steamId: string,
  gameId: string,
  steamAppId: string,
): Promise<number> {
  const appid = Number(steamAppId);

  const existingCount = await prisma.achievement.count({ where: { gameId } });
  if (existingCount === 0) {
    const [schema, percentages] = await Promise.all([
      getSteamGameSchema(appid),
      getSteamGlobalAchievementPercentages(appid),
    ]);

    if (schema.length > 0) {
      await prisma.achievement.createMany({
        data: schema.map((a) => ({
          gameId,
          apiName: a.apiName,
          displayName: a.displayName,
          description: a.description,
          iconUrl: a.iconUrl,
          iconGrayUrl: a.iconGrayUrl,
          globalUnlockedPercent: percentages.get(a.apiName) ?? null,
        })),
        skipDuplicates: true,
      });
    }
  }

  const achievements = await prisma.achievement.findMany({ where: { gameId } });
  if (achievements.length === 0) return 0;

  const playerAchievements = await getSteamPlayerAchievements(steamId, appid);
  const achievementByApiName = new Map(achievements.map((a) => [a.apiName, a]));

  let unlocked = 0;
  for (const playerAchievement of playerAchievements) {
    if (!playerAchievement.achieved) continue;
    const achievement = achievementByApiName.get(playerAchievement.apiName);
    if (!achievement) continue;

    await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
      update: {},
      create: { userId, achievementId: achievement.id, unlockedAt: playerAchievement.unlockedAt },
    });
    unlocked++;
  }

  return unlocked;
}

export async function syncAchievementsPage(userId: string, offset: number, limit: number) {
  const linkedGames = await prisma.log.findMany({
    where: { userId, game: { externalIds: { some: { source: "STEAM" } } } },
    select: {
      game: {
        select: { id: true, externalIds: { where: { source: "STEAM" }, select: { sourceId: true } } },
      },
    },
    orderBy: { gameId: "asc" },
  });

  const total = linkedGames.length;
  const page = linkedGames.slice(offset, offset + limit);

  const account = await prisma.account.findFirst({
    where: { userId, provider: "steam" },
    select: { providerAccountId: true },
  });
  if (!account) return { gamesProcessed: 0, achievementsUnlocked: 0, done: true };

  let achievementsUnlocked = 0;
  for (const { game } of page) {
    const steamAppId = game.externalIds[0]?.sourceId;
    if (!steamAppId) continue;
    achievementsUnlocked += await syncAchievementsForGame(userId, account.providerAccountId, game.id, steamAppId);
  }

  return { gamesProcessed: page.length, achievementsUnlocked, done: offset + limit >= total };
}
