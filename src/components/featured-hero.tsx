import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getWeeklyPopularGames } from "@/components/home-widgets";

const RECENT_RELEASE_DAYS = 14;
const MIN_WISHLISTS_FOR_FEATURE = 2;

// An awaited game that just came out: the most-wishlisted title released in
// the last two weeks, with a floor so an unanticipated release never wins.
async function getJustReleasedGame() {
  const since = new Date(Date.now() - RECENT_RELEASE_DAYS * 86_400_000);
  const grouped = await prisma.log.groupBy({
    by: ["gameId"],
    where: { status: "WISHLIST", game: { releaseDate: { gte: since, lte: new Date() } } },
    _count: { gameId: true },
    orderBy: { _count: { gameId: "desc" } },
    take: 1,
  });
  const top = grouped[0];
  if (!top || top._count.gameId < MIN_WISHLISTS_FOR_FEATURE) return null;
  return prisma.game.findUnique({ where: { id: top.gameId } });
}

// Featured game, by priority: a big awaited release from the last two weeks,
// otherwise the game most played this week (same query as the "popular this
// week" widget, deduped via cache()).
export async function FeaturedHero() {
  const t = await getTranslations("Home");
  const justReleased = await getJustReleasedGame();
  const game = justReleased ?? (await getWeeklyPopularGames())[0]?.game;
  if (!game) return null;

  const ratingStats = await prisma.log.aggregate({
    where: { gameId: game.id, rating: { not: null } },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return (
    <Link
      href={`/games/${game.slug}`}
      prefetch={false}
      className="group relative block overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="relative h-72 w-full sm:h-[26rem]">
        {game.artworkUrl ?? game.coverUrl ? (
          <Image
            src={game.artworkUrl ?? game.coverUrl!}
            alt=""
            fill
            unoptimized
            priority
            fetchPriority="high"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-foreground">
            {justReleased ? t("justReleasedBadge") : t("featuredBadge")}
          </span>
          {ratingStats._count.rating > 0 ? (
            <span className="text-sm font-semibold text-green-400">
              {(ratingStats._avg.rating ?? 0).toFixed(1)} / 10
            </span>
          ) : null}
        </div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{game.title}</h2>
        {game.summary ? (
          <p className="line-clamp-2 max-w-2xl text-sm text-muted-foreground">{game.summary}</p>
        ) : null}
      </div>
    </Link>
  );
}
