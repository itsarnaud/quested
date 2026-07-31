import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { GameGrid } from "@/components/game-grid";
import { FeaturedHero } from "@/components/featured-hero";
import { LikeButton } from "@/components/like-button";
import { UserBadges } from "@/components/user-badges";
import { Tabs, TabPanel } from "@/components/tabs";
import { HomeWidgets } from "@/components/home-widgets";
import type { Game } from "@/generated/prisma/client";

const DISCOVERY_GAMES_LIMIT = 24;

function getPopularGames() {
  return prisma.game.findMany({
    orderBy: { logs: { _count: "desc" } },
    take: DISCOVERY_GAMES_LIMIT,
  });
}

// Ranked by wishlist count among unreleased games, not just release date —
// a game coming out next week with zero wishlists isn't "anticipated".
async function getMostAnticipatedGames(): Promise<Game[]> {
  const grouped = await prisma.log.groupBy({
    by: ["gameId"],
    where: { status: "WISHLIST", game: { releaseDate: { gt: new Date() } } },
    _count: { gameId: true },
    orderBy: { _count: { gameId: "desc" } },
    take: DISCOVERY_GAMES_LIMIT,
  });
  if (grouped.length === 0) return [];

  const games = await prisma.game.findMany({ where: { id: { in: grouped.map((g) => g.gameId) } } });
  const gameById = new Map(games.map((g) => [g.id, g]));
  return grouped.map((g) => gameById.get(g.gameId)).filter((g): g is Game => Boolean(g));
}

const MIN_RATINGS_FOR_TOP_RATED = 3;

async function getTopRatedGames(): Promise<Game[]> {
  const grouped = await prisma.log.groupBy({
    by: ["gameId"],
    where: { rating: { not: null } },
    _avg: { rating: true },
    _count: { rating: true },
    having: { rating: { _count: { gte: MIN_RATINGS_FOR_TOP_RATED } } },
    orderBy: { _avg: { rating: "desc" } },
    take: DISCOVERY_GAMES_LIMIT,
  });
  if (grouped.length === 0) return [];

  const games = await prisma.game.findMany({ where: { id: { in: grouped.map((g) => g.gameId) } } });
  const gameById = new Map(games.map((g) => [g.id, g]));
  return grouped.map((g) => gameById.get(g.gameId)).filter((g): g is Game => Boolean(g));
}

const RECOMMENDATION_RATING_THRESHOLD = 7;
const GAMES_PER_SECTION = 12;
const MAX_GENRE_SECTIONS = 3;
const CANDIDATE_POOL_SIZE = 150;
const ACTIVITY_LIMIT = 20;

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
    <div className="mx-auto flex w-full max-w-7xl flex-1 gap-10 px-6 py-10">
      <div className="flex min-w-0 flex-1 flex-col gap-12 pt-6">
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

        <FeaturedHero />

        {popularGames.length > 0 ? (
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold tracking-tight">{t("popularTitle")}</h2>
            <GameGrid games={popularGames} />
          </div>
        ) : null}
      </div>

      <HomeWidgets userId={null} />
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

  const [activity, popularGames, newGames, topRatedGames, mostAnticipatedGames, recommendationSections] =
    await Promise.all([
      followingIds.length > 0
        ? prisma.log.findMany({
            where: { userId: { in: followingIds } },
            include: { game: true, user: true, likes: { select: { userId: true } } },
            orderBy: { updatedAt: "desc" },
            take: ACTIVITY_LIMIT,
          })
        : Promise.resolve([]),
      getPopularGames(),
      prisma.game.findMany({
        where: { releaseYear: { not: null } },
        orderBy: { releaseYear: "desc" },
        take: DISCOVERY_GAMES_LIMIT,
      }),
      getTopRatedGames(),
      getMostAnticipatedGames(),
      getRecommendationSections(userId, followingIds, t),
    ]);

  const activityContent = (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">{t("latestActivity")}</h2>

        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noActivity")}</p>
        ) : (
          <div className="grid items-start gap-x-8 gap-y-7 lg:grid-cols-2">
            {activity.map((log) => (
              <div key={log.id} className="flex gap-4">
                <Link
                  href={`/games/${log.game.slug}`}
                  prefetch={false}
                  className="relative h-28 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted transition-opacity hover:opacity-90"
                >
                  {log.game.coverUrl ? (
                    <Image src={log.game.coverUrl} alt={log.game.title} fill sizes="80px" className="object-cover" />
                  ) : null}
                </Link>

                {/* Like: in-flow under the text on mobile (a top-right heart
                    hugs the screen edge there), absolute top-right on sm+. */}
                <div className="relative flex min-w-0 flex-1 flex-col gap-1 sm:pr-14">
                  <Link
                    href={`/u/${log.user.username}`}
                    className="flex w-fit min-w-0 items-center gap-2 text-sm hover:underline"
                  >
                    <div className="relative size-6 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
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
                  </Link>

                  <Link
                    href={`/games/${log.game.slug}`}
                    prefetch={false}
                    className="truncate text-base font-semibold tracking-tight hover:underline"
                  >
                    {log.game.title}
                  </Link>

                  <span className="text-sm text-muted-foreground">
                    {tStatus(log.status)}
                    {log.rating != null ? (
                      <>
                        {" · "}
                        <span className="font-medium text-green-400">{log.rating.toFixed(1)}/10</span>
                      </>
                    ) : null}
                  </span>

                  {log.notes ? (
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{log.notes}</p>
                  ) : null}

                  <div className="mt-1 sm:absolute sm:right-0 sm:top-0 sm:mt-0">
                    <LikeButton
                      logId={log.id}
                      initialLiked={log.likes.some((like) => like.userId === userId)}
                      initialCount={log.likes.length}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const recommendedContent =
    recommendationSections.length === 0 ? (
      <p className="text-sm text-muted-foreground">{t("noRecommendations")}</p>
    ) : (
      <div className="flex flex-col gap-8">
        {recommendationSections.map((section) => (
          <div key={section.key} className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-muted-foreground">{section.heading}</h3>
            <GameGrid games={section.games} />
          </div>
        ))}
      </div>
    );

  const popularContent = <GameGrid games={popularGames} />;

  const newContent = <GameGrid games={newGames} />;

  const topRatedContent =
    topRatedGames.length === 0 ? (
      <p className="text-sm text-muted-foreground">{t("noTopRated")}</p>
    ) : (
      <GameGrid games={topRatedGames} />
    );

  const mostAnticipatedContent =
    mostAnticipatedGames.length === 0 ? (
      <p className="text-sm text-muted-foreground">{t("noMostAnticipated")}</p>
    ) : (
      <GameGrid games={mostAnticipatedGames} />
    );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 gap-10 px-6 py-10">
      <div className="flex min-w-0 flex-1 flex-col gap-8">
        <FeaturedHero />

        <Tabs defaultTab="activity">
          <TabPanel key="activity" tabKey="activity" label={t("activityTab")}>
            {activityContent}
          </TabPanel>
          <TabPanel key="recommended" tabKey="recommended" label={t("recommendedTab")}>
            {recommendedContent}
          </TabPanel>
          <TabPanel key="popular" tabKey="popular" label={t("popularTab")}>
            {popularContent}
          </TabPanel>
          <TabPanel key="topRated" tabKey="topRated" label={t("topRatedTab")}>
            {topRatedContent}
          </TabPanel>
          <TabPanel key="new" tabKey="new" label={t("newTab")}>
            {newContent}
          </TabPanel>
          <TabPanel key="mostAnticipated" tabKey="mostAnticipated" label={t("mostAnticipatedTab")}>
            {mostAnticipatedContent}
          </TabPanel>
        </Tabs>
      </div>

      <HomeWidgets userId={userId} />
    </div>
  );
}
