import type { TrophyTitle } from "psn-api";
import { prisma } from "@/lib/prisma";
import { getPsnTitleTrophyDefinitions, getPsnUserEarnedTrophies } from "@/server/psn/client";
import { parsePsnSourceId } from "@/server/psn/sync";

/**
 * Syncs one title's trophies for one user. The trophy definitions
 * (name/description/icon) are title-level and only fetched once ever per
 * canonical Game — every later sync, by any user, reuses the rows already
 * in the `Achievement` table. Only the per-user earned status (which also
 * carries the global earn-rate, PSN's equivalent of Steam's global
 * unlocked percentage) is fetched on every call.
 */
export async function syncTrophiesForTitle(
  userId: string,
  accountId: string,
  gameId: string,
  title: Pick<TrophyTitle, "npCommunicationId" | "npServiceName">,
): Promise<number> {
  const existingCount = await prisma.achievement.count({ where: { gameId } });
  if (existingCount === 0) {
    const { trophies } = await getPsnTitleTrophyDefinitions(title);
    if (trophies.length > 0) {
      await prisma.achievement.createMany({
        data: trophies.map((t) => ({
          gameId,
          apiName: String(t.trophyId),
          displayName: t.trophyName ?? "?",
          description: t.trophyDetail ?? null,
          iconUrl: t.trophyIconUrl ?? "",
          iconGrayUrl: t.trophyIconUrl ?? "",
          isPlatinum: t.trophyType === "platinum",
        })),
        skipDuplicates: true,
      });
    }
  }

  const achievements = await prisma.achievement.findMany({ where: { gameId } });
  if (achievements.length === 0) return 0;

  const { trophies: earnedTrophies } = await getPsnUserEarnedTrophies(accountId, title);
  const achievementByApiName = new Map(achievements.map((a) => [a.apiName, a]));

  let unlocked = 0;
  for (const earned of earnedTrophies) {
    if (!earned.earned) continue;
    const achievement = achievementByApiName.get(String(earned.trophyId));
    if (!achievement) continue;

    // Global rarity comes from the per-user earned-status call on PSN
    // (trophyEarnedRate), unlike Steam where it's a separate endpoint —
    // backfill it here since it wasn't known yet when the Achievement row
    // was first created from the definitions call above.
    const globalUnlockedPercent = earned.trophyEarnedRate ? Number(earned.trophyEarnedRate) : null;
    if (globalUnlockedPercent !== null && achievement.globalUnlockedPercent === null) {
      await prisma.achievement.update({
        where: { id: achievement.id },
        data: { globalUnlockedPercent },
      });
    }

    await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
      update: {},
      create: {
        userId,
        achievementId: achievement.id,
        unlockedAt: earned.earnedDateTime ? new Date(earned.earnedDateTime) : null,
      },
    });
    unlocked++;
  }

  // A Platinum unlock is an unambiguous "done" signal, even when the
  // trophy list isn't 100% complete (Sony can add trophies post-launch —
  // see Achievement.isPlatinum) — so it overrides whatever status the
  // library sync guessed at import time, or whatever the user set.
  const platinumAchievement = achievements.find((a) => a.isPlatinum);
  if (platinumAchievement) {
    const platinumUnlocked = earnedTrophies.some(
      (t) => t.earned && String(t.trophyId) === platinumAchievement.apiName,
    );
    if (platinumUnlocked) {
      await prisma.log.updateMany({
        where: { userId, gameId, status: { not: "COMPLETED" } },
        data: { status: "COMPLETED" },
      });
    }
  }

  return unlocked;
}

export async function syncPsnAchievementsPage(userId: string, accountId: string, offset: number, limit: number) {
  const linkedGames = await prisma.log.findMany({
    where: { userId, game: { externalIds: { some: { source: "PSN" } } } },
    select: {
      game: {
        select: { id: true, externalIds: { where: { source: "PSN" }, select: { sourceId: true } } },
      },
    },
    orderBy: { gameId: "asc" },
  });

  const total = linkedGames.length;
  const page = linkedGames.slice(offset, offset + limit);

  // Parallelized within the page rather than one game at a time — each game
  // is 1-2 PSN API round trips, and syncing them sequentially was the main
  // reason a big library took a long time to fully sync. allSettled (not
  // all) so one game's transient failure doesn't lose the rest of the page.
  const results = await Promise.allSettled(
    page.map(({ game }) => {
      const sourceId = game.externalIds[0]?.sourceId;
      if (!sourceId) return Promise.resolve(0);
      const title = parsePsnSourceId(sourceId);
      return syncTrophiesForTitle(userId, accountId, game.id, title);
    }),
  );

  let achievementsUnlocked = 0;
  for (const result of results) {
    if (result.status === "fulfilled") {
      achievementsUnlocked += result.value;
    } else {
      console.error("PSN trophy sync failed for one game:", result.reason);
    }
  }

  return { gamesProcessed: page.length, achievementsUnlocked, done: offset + limit >= total };
}
