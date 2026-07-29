import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/game-card";
import { LikeButton } from "@/components/like-button";
import { UserBadges } from "@/components/user-badges";
import type { Game } from "@/generated/prisma/client";

function getPopularGames() {
  return prisma.game.findMany({
    orderBy: { logs: { _count: "desc" } },
    take: 12,
  });
}

const RECOMMENDATION_RATING_THRESHOLD = 7;
const GAMES_PER_SECTION = 6;
const MAX_GENRE_SECTIONS = 3;
const CANDIDATE_POOL_SIZE = 100;

// Weights for how much each shared taxonomy field counts toward a content
// match — genres are the strongest taste signal, developers next. Platform
// is deliberately excluded: almost every game lists "PC", so it matches
// everything and adds noise rather than signal.
const GENRE_WEIGHT = 3;
const DEVELOPER_WEIGHT = 2;

export type RecommendationSection = {
  key: string;
  heading: string;
  games: Game[];
};

// Primary signal: one section per genre this user rates highly, each filled
// with unplayed games sharing that genre (and, as a tie-breaker, developer
// overlap with the user's taste profile).
async function getGenreSections(
  userId: string,
  loggedGameIds: string[],
  t: Awaited<ReturnType<typeof getTranslations>>,
): Promise<{ sections: RecommendationSection[]; usedGameIds: Set<string> }> {
  const usedGameIds = new Set(loggedGameIds);

  const tasteLogs = await prisma.log.findMany({
    where: { userId, rating: { gte: RECOMMENDATION_RATING_THRESHOLD } },
    select: { game: { select: { genres: true, developers: true } } },
  });
  if (tasteLogs.length === 0) return { sections: [], usedGameIds };

  const genreWeight = new Map<string, number>();
  const developerWeight = new Map<string, number>();

  for (const { game } of tasteLogs) {
    for (const genre of game.genres) genreWeight.set(genre, (genreWeight.get(genre) ?? 0) + 1);
    for (const dev of game.developers) developerWeight.set(dev, (developerWeight.get(dev) ?? 0) + 1);
  }

  const topGenres = [...genreWeight.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_GENRE_SECTIONS)
    .map(([genre]) => genre);

  const sections: RecommendationSection[] = [];

  for (const genre of topGenres) {
    const candidates = await prisma.game.findMany({
      where: { id: { notIn: [...usedGameIds] }, logs: { some: {} }, genres: { has: genre } },
      orderBy: { logs: { _count: "desc" } },
      take: CANDIDATE_POOL_SIZE,
    });

    const games = candidates
      .map((game) => ({
        game,
        score:
          game.genres.reduce((sum, g) => sum + (genreWeight.get(g) ?? 0) * GENRE_WEIGHT, 0) +
          game.developers.reduce((sum, d) => sum + (developerWeight.get(d) ?? 0) * DEVELOPER_WEIGHT, 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, GAMES_PER_SECTION)
      .map((r) => r.game);

    if (games.length === 0) continue;

    for (const game of games) usedGameIds.add(game.id);
    sections.push({ key: `genre-${genre}`, heading: t("recommendedBecauseGenre", { genre }), games });
  }

  return { sections, usedGameIds };
}

// Secondary signal: games liked by people this user follows, shown as one
// extra section on top of the genre-based ones.
async function getSocialSection(
  followingIds: string[],
  excludeGameIds: Set<string>,
  t: Awaited<ReturnType<typeof getTranslations>>,
): Promise<RecommendationSection | null> {
  if (followingIds.length === 0) return null;

  const grouped = await prisma.log.groupBy({
    by: ["gameId"],
    where: {
      userId: { in: followingIds },
      rating: { gte: RECOMMENDATION_RATING_THRESHOLD },
      gameId: { notIn: [...excludeGameIds] },
    },
    _count: { gameId: true },
    orderBy: { _count: { gameId: "desc" } },
    take: GAMES_PER_SECTION,
  });
  if (grouped.length === 0) return null;

  const games = await prisma.game.findMany({ where: { id: { in: grouped.map((g) => g.gameId) } } });
  const gameById = new Map(games.map((g) => [g.id, g]));
  const ordered = grouped.map((g) => gameById.get(g.gameId)).filter((g): g is Game => Boolean(g));

  return { key: "social", heading: t("recommendedByFollows"), games: ordered };
}

async function getRecommendationSections(
  userId: string,
  followingIds: string[],
  t: Awaited<ReturnType<typeof getTranslations>>,
): Promise<RecommendationSection[]> {
  const loggedGameIds = (
    await prisma.log.findMany({ where: { userId }, select: { gameId: true } })
  ).map((l) => l.gameId);

  const { sections, usedGameIds } = await getGenreSections(userId, loggedGameIds, t);
  const socialSection = await getSocialSection(followingIds, usedGameIds, t);

  return socialSection ? [...sections, socialSection] : sections;
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
          <h2 className="text-base font-semibold tracking-tight">{t("popularTitle")}</h2>
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

  const [activity, popularGames, newGames, recommendationSections] = await Promise.all([
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
    getRecommendationSections(userId, followingIds, t),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-10">
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold tracking-tight">{t("activityTitle")}</h2>
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
                    <span className="truncate font-medium">{log.user.name ?? log.user.username}</span>
                    <UserBadges badges={log.user.badges} />
                    <span className="shrink-0 text-muted-foreground">
                      @{log.user.username} · {tStatus(log.status)}
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

      {recommendationSections.length > 0 ? (
        <div className="flex flex-col gap-8">
          <h2 className="text-base font-semibold tracking-tight">{t("recommendedTitle")}</h2>
          {recommendationSections.map((section) => (
            <div key={section.key} className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-muted-foreground">{section.heading}</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
                {section.games.map((game) => (
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
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold tracking-tight">{t("popularTitle")}</h2>
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
        <h2 className="text-base font-semibold tracking-tight">{t("newTitle")}</h2>
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
