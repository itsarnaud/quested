import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/game-card";
import { LikeButton } from "@/components/like-button";

function getPopularGames() {
  return prisma.game.findMany({
    orderBy: { logs: { _count: "desc" } },
    take: 12,
  });
}

const RECOMMENDATION_RATING_THRESHOLD = 7;

async function getRecommendations(userId: string, followingIds: string[]) {
  if (followingIds.length === 0) return [];

  const myLoggedGameIds = (
    await prisma.log.findMany({ where: { userId }, select: { gameId: true } })
  ).map((l) => l.gameId);

  const grouped = await prisma.log.groupBy({
    by: ["gameId"],
    where: {
      userId: { in: followingIds },
      rating: { gte: RECOMMENDATION_RATING_THRESHOLD },
      gameId: { notIn: myLoggedGameIds },
    },
    _count: { gameId: true },
    orderBy: { _count: { gameId: "desc" } },
    take: 6,
  });
  if (grouped.length === 0) return [];

  const games = await prisma.game.findMany({ where: { id: { in: grouped.map((g) => g.gameId) } } });
  const gameById = new Map(games.map((g) => [g.id, g]));

  return grouped
    .map((g) => ({ game: gameById.get(g.gameId), count: g._count.gameId }))
    .filter((r): r is { game: NonNullable<typeof r.game>; count: number } => Boolean(r.game));
}

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return <MarketingHome />;
  }

  return <Feed userId={session.user.id} />;
}

async function MarketingHome() {
  const [t, popularGames] = await Promise.all([getTranslations("Home"), getPopularGames()]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-6 py-16">
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Quested</h1>
        <p className="text-muted-foreground">{t("tagline")}</p>
        <div className="flex justify-center gap-3">
          <Link href="/search">
            <Button>{t("getStarted")}</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary">{t("signIn")}</Button>
          </Link>
        </div>
      </div>

      {popularGames.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">{t("popularTitle")}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {popularGames.map((game) => (
              <GameCard
                key={game.id}
                slug={game.slug}
                title={game.title}
                releaseYear={game.releaseYear}
                coverUrl={game.coverUrl}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

async function Feed({ userId }: { userId: string }) {
  const t = await getTranslations("Home");
  const tStatus = await getTranslations("GameStatus");

  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);

  const [activity, popularGames, newGames, recommendations] = await Promise.all([
    followingIds.length > 0
      ? prisma.log.findMany({
          where: { userId: { in: followingIds } },
          include: { game: true, user: true, likes: { select: { userId: true } } },
          orderBy: { updatedAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
    getPopularGames(),
    prisma.game.findMany({
      where: { releaseYear: { not: null } },
      orderBy: { releaseYear: "desc" },
      take: 12,
    }),
    getRecommendations(userId, followingIds),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-10">
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t("activityTitle")}</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noActivity")}</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {activity.map((log) => (
              <div key={log.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={`/u/${log.user.username}`}
                    className="flex min-w-0 items-center gap-2 text-sm hover:underline"
                  >
                    <div className="relative size-7 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                      {log.user.image ? (
                        <Image
                          src={log.user.image}
                          alt={log.user.username ?? ""}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <span className="truncate font-medium">@{log.user.username}</span>
                    <span className="shrink-0 text-muted-foreground">
                      · {tStatus(log.status)}
                      {log.rating != null ? ` · ${log.rating.toFixed(1)}/10` : ""}
                    </span>
                  </Link>

                  <LikeButton
                    logId={log.id}
                    initialLiked={log.likes.some((like) => like.userId === userId)}
                    initialCount={log.likes.length}
                  />
                </div>

                <Link href={`/games/${log.game.slug}`} className="flex gap-3 hover:opacity-90">
                  <div className="relative h-24 w-[72px] shrink-0 overflow-hidden rounded border border-border bg-muted">
                    {log.game.coverUrl ? (
                      <Image
                        src={log.game.coverUrl}
                        alt={log.game.title}
                        fill
                        sizes="72px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="font-medium">{log.game.title}</span>
                    {log.game.releaseYear ? (
                      <span className="text-sm text-muted-foreground">{log.game.releaseYear}</span>
                    ) : null}
                  </div>
                </Link>

                {log.notes ? (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{log.notes}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {recommendations.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">{t("recommendedTitle")}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {recommendations.map(({ game, count }) => (
              <GameCard
                key={game.id}
                slug={game.slug}
                title={game.title}
                releaseYear={game.releaseYear}
                coverUrl={game.coverUrl}
                subtitle={t("recommendedBy", { count })}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t("popularTitle")}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {popularGames.map((game) => (
            <GameCard
              key={game.id}
              slug={game.slug}
              title={game.title}
              releaseYear={game.releaseYear}
              coverUrl={game.coverUrl}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t("newTitle")}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {newGames.map((game) => (
            <GameCard
              key={game.id}
              slug={game.slug}
              title={game.title}
              releaseYear={game.releaseYear}
              coverUrl={game.coverUrl}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
