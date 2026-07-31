import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getWeeklyPopularGames } from "@/components/home-widgets";

// The game most played this week, taken from the same query as the
// "popular this week" widget (deduped via cache()).
export async function FeaturedHero() {
  const t = await getTranslations("Home");
  const weekly = await getWeeklyPopularGames();
  const featured = weekly[0];
  if (!featured) return null;

  const ratingStats = await prisma.log.aggregate({
    where: { gameId: featured.game.id, rating: { not: null } },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return (
    <Link
      href={`/games/${featured.game.slug}`}
      prefetch={false}
      className="group relative block overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="relative h-72 w-full sm:h-[26rem]">
        {featured.game.coverUrl ? (
          <Image
            src={featured.game.coverUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 900px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-foreground">
            {t("featuredBadge")}
          </span>
          {ratingStats._count.rating > 0 ? (
            <span className="text-sm font-semibold text-green-400">
              {(ratingStats._avg.rating ?? 0).toFixed(1)} / 10
            </span>
          ) : null}
        </div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{featured.game.title}</h2>
        {featured.game.summary ? (
          <p className="line-clamp-2 max-w-2xl text-sm text-muted-foreground">{featured.game.summary}</p>
        ) : null}
      </div>
    </Link>
  );
}
