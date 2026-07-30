import { cache } from "react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { SuggestionsWidget } from "@/components/suggestions-widget";
import type { Game } from "@/generated/prisma/client";

const WIDGET_GAMES = 3;
const WIDGET_LEADERBOARD = 3;

export type WeeklyPopularGame = { game: Game; players: number };

// Games ranked by distinct players active on them in the last 7 days,
// falling back to all-time popularity when the week is too quiet.
// cache(): also used by the home hero, so the query runs once per request.
export const getWeeklyPopularGames = cache(async (): Promise<WeeklyPopularGame[]> => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const grouped = await prisma.log.groupBy({
    by: ["gameId"],
    where: { updatedAt: { gte: weekAgo } },
    _count: { gameId: true },
    orderBy: { _count: { gameId: "desc" } },
    take: WIDGET_GAMES,
  });

  if (grouped.length > 0) {
    const games = await prisma.game.findMany({ where: { id: { in: grouped.map((g) => g.gameId) } } });
    const gameById = new Map(games.map((g) => [g.id, g]));
    return grouped
      .map((g) => ({ game: gameById.get(g.gameId), players: g._count.gameId }))
      .filter((r): r is WeeklyPopularGame => Boolean(r.game));
  }

  const fallback = await prisma.game.findMany({
    where: { logs: { some: {} } },
    orderBy: { logs: { _count: "desc" } },
    include: { _count: { select: { logs: true } } },
    take: WIDGET_GAMES,
  });
  return fallback.map((game) => ({ game, players: game._count.logs }));
});

async function getLeaderboardPreview(userId: string) {
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  if (following.length === 0) return [];

  const userIds = [userId, ...following.map((f) => f.followingId)];
  const [users, completedCounts] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, name: true, image: true },
    }),
    prisma.log.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, status: "COMPLETED" },
      _count: { userId: true },
    }),
  ]);

  const countById = new Map(completedCounts.map((c) => [c.userId, c._count.userId]));
  return users
    .map((user) => ({ user, completed: countById.get(user.id) ?? 0 }))
    .sort((a, b) => b.completed - a.completed)
    .slice(0, WIDGET_LEADERBOARD);
}

export async function HomeWidgets({ userId }: { userId: string | null }) {
  const [t, tLeaderboard, weeklyPopular, leaderboard] = await Promise.all([
    getTranslations("Home"),
    getTranslations("Leaderboard"),
    getWeeklyPopularGames(),
    userId ? getLeaderboardPreview(userId) : Promise.resolve([]),
  ]);

  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-8 xl:flex">
      {weeklyPopular.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("widgetPopularWeek")}
          </h2>
          <div className="flex flex-col gap-3">
            {weeklyPopular.map(({ game, players }) => (
              <Link
                key={game.id}
                href={`/games/${game.slug}`}
                prefetch={false}
                className="group flex items-center gap-3"
              >
                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded border border-border bg-muted">
                  {game.coverUrl ? (
                    <Image src={game.coverUrl} alt="" fill sizes="40px" className="object-cover" />
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium group-hover:underline">{game.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {t("widgetPlayersWeek", { count: players })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {leaderboard.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("widgetLeaderboard")}
          </h2>
          <div className="flex flex-col gap-3">
            {leaderboard.map(({ user, completed }, index) => (
              <Link
                key={user.id}
                href={user.username ? `/u/${user.username}` : "/leaderboard"}
                prefetch={false}
                className="group flex items-center gap-3"
              >
                <span className="w-3 text-center text-xs text-muted-foreground">{index + 1}</span>
                <div className="relative size-7 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                  {user.image ? (
                    <Image src={user.image} alt="" fill unoptimized className="object-cover" />
                  ) : null}
                </div>
                <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:underline">
                  {user.name ?? user.username}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {tLeaderboard("gamesCompleted", { count: completed })}
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/leaderboard"
            className="mt-1 rounded-md border border-border py-2 text-center text-xs font-semibold uppercase tracking-wider text-accent transition-colors hover:bg-muted"
          >
            {t("widgetLeaderboardAll")}
          </Link>
        </div>
      ) : null}

      {userId ? <SuggestionsWidget /> : null}
    </aside>
  );
}
