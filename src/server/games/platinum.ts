import { prisma } from "@/lib/prisma";

// A game is "platinum" (PlayStation-trophy style) when a user has unlocked
// every Steam achievement it has. Only games with at least one Achievement
// row can ever qualify — most games have none (no Steam stats, or never synced).
export async function getPlatinumGameIds(userId: string, gameIds: string[]): Promise<Set<string>> {
  if (gameIds.length === 0) return new Set();

  const totals = await prisma.achievement.groupBy({
    by: ["gameId"],
    where: { gameId: { in: gameIds } },
    _count: { _all: true },
  });
  if (totals.length === 0) return new Set();

  const totalByGame = new Map(totals.map((t) => [t.gameId, t._count._all]));

  const unlocked = await prisma.userAchievement.findMany({
    where: { userId, achievement: { gameId: { in: Array.from(totalByGame.keys()) } } },
    select: { achievement: { select: { gameId: true } } },
  });
  const unlockedByGame = new Map<string, number>();
  for (const u of unlocked) {
    unlockedByGame.set(u.achievement.gameId, (unlockedByGame.get(u.achievement.gameId) ?? 0) + 1);
  }

  const platinum = new Set<string>();
  for (const [gameId, total] of totalByGame) {
    if (unlockedByGame.get(gameId) === total) platinum.add(gameId);
  }
  return platinum;
}
