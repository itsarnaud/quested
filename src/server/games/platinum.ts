import { prisma } from "@/lib/prisma";

// A game is "platinum" — 100%'d on at least one linked platform:
//
// - PSN games have a real Platinum trophy (Achievement.isPlatinum) — that
//   specific trophy being unlocked IS the definition, straight from Sony.
// - Everything else (Steam etc.) has no such concept, so it falls back to
//   the old heuristic: every tracked achievement unlocked. This heuristic
//   can be wrong for PSN in edge cases (a title's trophy list growing after
//   launch means someone who platinumed early won't show 100% of what we
//   later import) which is exactly why real games get the real signal instead.
//
// Checked per source (Achievement.source), not across a game's combined
// list: a game linked to both Steam and PSN (same Game row, two
// independent achievement lists) rarely finishes identically on each, so a
// real Steam 100% shouldn't get hidden behind an unearned PSN Platinum.
export async function getPlatinumGameIds(userId: string, gameIds: string[]): Promise<Set<string>> {
  if (gameIds.length === 0) return new Set();

  const platinum = new Set<string>();

  const platinumAchievements = await prisma.achievement.findMany({
    where: { gameId: { in: gameIds }, isPlatinum: true },
    select: { id: true, gameId: true },
  });
  const platinumAchievementIdByGame = new Map(platinumAchievements.map((a) => [a.gameId, a.id]));

  if (platinumAchievementIdByGame.size > 0) {
    const unlockedPlatinums = await prisma.userAchievement.findMany({
      where: { userId, achievementId: { in: Array.from(platinumAchievementIdByGame.values()) } },
      select: { achievementId: true },
    });
    const unlockedAchievementIds = new Set(unlockedPlatinums.map((u) => u.achievementId));
    for (const [gameId, achievementId] of platinumAchievementIdByGame) {
      if (unlockedAchievementIds.has(achievementId)) platinum.add(gameId);
    }
  }

  const heuristicGameIds = gameIds.filter((id) => !platinum.has(id));
  if (heuristicGameIds.length === 0) return platinum;

  const totals = await prisma.achievement.groupBy({
    by: ["gameId", "source"],
    where: { gameId: { in: heuristicGameIds } },
    _count: { _all: true },
  });
  if (totals.length === 0) return platinum;

  const unlocked = await prisma.userAchievement.findMany({
    where: { userId, achievement: { gameId: { in: heuristicGameIds } } },
    select: { achievement: { select: { gameId: true, source: true } } },
  });
  const unlockedByGameSource = new Map<string, number>();
  for (const u of unlocked) {
    const key = `${u.achievement.gameId}:${u.achievement.source}`;
    unlockedByGameSource.set(key, (unlockedByGameSource.get(key) ?? 0) + 1);
  }

  for (const t of totals) {
    const key = `${t.gameId}:${t.source}`;
    if (unlockedByGameSource.get(key) === t._count._all) platinum.add(t.gameId);
  }
  return platinum;
}
