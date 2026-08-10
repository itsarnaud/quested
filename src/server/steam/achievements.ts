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
 *
 * Scoped by `source: "STEAM"` throughout — a game linked to both Steam and
 * PSN shares one Game row but has two independent achievement lists (see
 * Achievement.source in the schema). Without this scoping, whichever
 * provider synced first would block the other's definitions from ever
 * being created.
 */
export async function syncAchievementsForGame(
  userId: string,
  steamId: string,
  gameId: string,
  steamAppId: string,
): Promise<number> {
  const appid = Number(steamAppId);

  const existingCount = await prisma.achievement.count({ where: { gameId, source: "STEAM" } });
  if (existingCount === 0) {
    const [schema, percentages] = await Promise.all([
      getSteamGameSchema(appid),
      getSteamGlobalAchievementPercentages(appid),
    ]);

    if (schema.length > 0) {
      await prisma.achievement.createMany({
        data: schema.map((a) => ({
          gameId,
          source: "STEAM",
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

  const achievements = await prisma.achievement.findMany({ where: { gameId, source: "STEAM" } });
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

  // Steam has no Platinum-style single trophy, so unlike PSN this can only
  // go by "every achievement Steam reports for this game is unlocked" —
  // mirrors the PSN Platinum-unlock override in src/server/psn/achievements.ts.
  const totalUnlocked = await prisma.userAchievement.count({
    where: { userId, achievementId: { in: achievements.map((a) => a.id) } },
  });
  if (totalUnlocked === achievements.length) {
    await prisma.log.updateMany({
      where: { userId, gameId, status: { not: "COMPLETED" } },
      data: { status: "COMPLETED" },
    });
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

  // Parallelized within the page rather than one game at a time — see the
  // same change in src/server/psn/achievements.ts for the reasoning.
  // allSettled (not all) so one game's transient failure doesn't lose the
  // rest of the page.
  const results = await Promise.allSettled(
    page.map(({ game }) => {
      const steamAppId = game.externalIds[0]?.sourceId;
      if (!steamAppId) return Promise.resolve(0);
      return syncAchievementsForGame(userId, account.providerAccountId, game.id, steamAppId);
    }),
  );

  let achievementsUnlocked = 0;
  for (const result of results) {
    if (result.status === "fulfilled") {
      achievementsUnlocked += result.value;
    } else {
      console.error("Steam achievement sync failed for one game:", result.reason);
    }
  }

  return { gamesProcessed: page.length, achievementsUnlocked, done: offset + limit >= total };
}
