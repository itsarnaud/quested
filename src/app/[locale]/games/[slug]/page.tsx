import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LogControls } from "@/components/log-controls";
import { LikeButton } from "@/components/like-button";
import { HeartIcon } from "@/components/icons/heart-icon";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { RatingHistogram } from "@/components/rating-histogram";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { pageAlternates } from "@/lib/alternates";
import { siteUrl } from "@/lib/site";
import { AchievementsSection } from "@/app/[locale]/games/[slug]/achievements-section";

// Cached across requests (5 min) since game data only changes via IGDB
// resync; React's cache() further dedupes within a single request.
const getGameCached = unstable_cache(
  (slug: string) => prisma.game.findUnique({ where: { slug } }),
  ["game-by-slug"],
  { revalidate: 300 },
);

// unstable_cache serializes its return value, so releaseDate comes back as
// a string on cache hits — rehydrate it into a real Date for callers.
const getGame = cache(async (slug: string) => {
  const game = await getGameCached(slug);
  if (!game) return game;
  return { ...game, releaseDate: game.releaseDate ? new Date(game.releaseDate) : null };
});

const TOP_REVIEWS_LIMIT = 8;

type PageProps = {
  params: Promise<{ slug: string; locale: string }>;
};

function formatReleaseDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }).format(date);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const [game, t] = await Promise.all([getGame(slug), getTranslations({ locale, namespace: "GamePage" })]);
  if (!game) return {};

  const title = game.releaseYear ? `${game.title} (${game.releaseYear})` : game.title;
  // Next doesn't fall back to the parent layout's description when a page
  // explicitly returns `undefined` for it — it just omits the tag — so a
  // game-specific fallback is needed here instead of relying on inheritance.
  const description = game.summary ?? t("metaDescriptionFallback", { title: game.title });
  const images = game.coverUrl ? [{ url: game.coverUrl }] : undefined;

  return {
    title,
    description,
    alternates: pageAlternates(locale, `/games/${slug}`),
    openGraph: { title, description, images, type: "website" },
    twitter: { title, description, images, card: images ? "summary_large_image" : "summary" },
  };
}

export default async function GamePage({ params }: PageProps) {
  const { slug, locale } = await params;
  const [game, session, t, tStatus, tCommon] = await Promise.all([
    getGame(slug),
    auth(),
    getTranslations("GamePage"),
    getTranslations("GameStatus"),
    getTranslations("Common"),
  ]);

  if (!game) notFound();

  const isUnreleased = Boolean(game.releaseYear && game.releaseYear > new Date().getFullYear());

  const [ratingStats, ratingRows, statusGroups, reviewCount, listCount, topReviews] = await Promise.all([
    prisma.log.aggregate({
      where: { gameId: game.id, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.log.findMany({
      where: { gameId: game.id, rating: { not: null } },
      select: { rating: true },
    }),
    prisma.log.groupBy({
      by: ["status"],
      where: { gameId: game.id },
      _count: { status: true },
    }),
    prisma.log.count({ where: { gameId: game.id, notes: { not: null } } }),
    prisma.gameListItem.count({ where: { gameId: game.id } }),
    prisma.log.findMany({
      where: { gameId: game.id, notes: { not: null } },
      include: {
        user: { select: { username: true, name: true, image: true } },
        likes: { select: { userId: true } },
      },
      orderBy: { likes: { _count: "desc" } },
      take: TOP_REVIEWS_LIMIT,
    }),
  ]);

  const statusCounts: Record<string, number> = {
    BACKLOG: 0,
    PLAYING: 0,
    COMPLETED: 0,
    DROPPED: 0,
    WISHLIST: 0,
  };
  for (const group of statusGroups) statusCounts[group.status] = group._count.status;

  const metaLine = [game.developers.join(", "), game.releaseYear, game.genres.join(", ")]
    .filter(Boolean)
    .join(" · ");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    url: `${siteUrl}/games/${game.slug}`,
    ...(game.summary ? { description: game.summary } : {}),
    ...(game.coverUrl ? { image: game.coverUrl } : {}),
    ...(game.developers.length > 0 ? { author: game.developers.map((name) => ({ "@type": "Organization", name })) } : {}),
    ...(game.genres.length > 0 ? { genre: game.genres } : {}),
    ...(game.platforms.length > 0 ? { gamePlatform: game.platforms } : {}),
    ...(game.releaseDate ? { datePublished: game.releaseDate.toISOString().slice(0, 10) } : {}),
    ...(ratingStats._count.rating > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: (ratingStats._avg.rating ?? 0).toFixed(1),
            bestRating: "10",
            worstRating: "0",
            ratingCount: ratingStats._count.rating,
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BackLink label={tCommon("back")} />

      <div className="flex flex-col gap-8 sm:flex-row sm:gap-10">
        <div className="mx-auto w-44 shrink-0 sm:mx-0 sm:w-56">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-border bg-muted">
            {game.coverUrl ? (
              <Image
                src={game.coverUrl}
                alt={game.title}
                fill
                unoptimized
                priority
                fetchPriority="high"
                className="object-cover"
              />
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 text-center sm:text-left">
          <div className="flex flex-col gap-2">
            {metaLine ? (
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <p className="text-sm text-muted-foreground">{metaLine}</p>
                {game.releaseDate ? (
                  <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {isUnreleased ? t("unreleasedBadge") : t("releasedBadge")} ·{" "}
                    {formatReleaseDate(game.releaseDate, locale)}
                  </span>
                ) : null}
              </div>
            ) : null}

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{game.title}</h1>

            {ratingStats._count.rating > 0 ? (
              <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 sm:justify-start">
                <span className="text-3xl font-bold text-green-400">
                  {(ratingStats._avg.rating ?? 0).toFixed(1)} / 10
                </span>
                <span className="text-sm text-muted-foreground">
                  {t("communityAvg")} · {t("ratingsCount", { count: ratingStats._count.rating })}
                </span>
              </div>
            ) : null}
          </div>

          {game.summary ? <p className="text-sm leading-relaxed text-muted-foreground">{game.summary}</p> : null}

          {game.platforms.length > 0 ? (
            <p className="text-sm text-muted-foreground">{game.platforms.join(", ")}</p>
          ) : null}

          <div className="mt-2 flex flex-col gap-4 rounded-xl bg-card p-5 text-left">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("yourTracking")}
            </span>
            {session?.user ? (
              <LogControls gameId={game.id} isUnreleased={isUnreleased} />
            ) : (
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <p className="text-sm text-muted-foreground">{t("signInPrompt")}</p>
                <Link href="/login">
                  <Button variant="secondary">{t("signIn")}</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <RatingHistogram
          averageRating={ratingStats._avg.rating}
          ratingCount={ratingStats._count.rating}
          ratings={ratingRows.map((r) => r.rating!)}
          ratingLabel={t("avgRating")}
        />

        <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
          {[
            { label: tStatus("BACKLOG"), count: statusCounts.BACKLOG },
            { label: tStatus("PLAYING"), count: statusCounts.PLAYING },
            { label: tStatus("COMPLETED"), count: statusCounts.COMPLETED },
            { label: tStatus("DROPPED"), count: statusCounts.DROPPED },
            { label: tStatus("WISHLIST"), count: statusCounts.WISHLIST },
            { label: t("reviewsCount"), count: reviewCount },
            { label: t("listsCount"), count: listCount },
          ].map((tile) => (
            <div key={tile.label} className="flex min-w-0 flex-col gap-1 rounded-md border border-border p-3 text-center items-center justify-center">
              <span className="text-lg font-semibold tracking-tight">{tile.count}</span>
              <span className="text-xs text-muted-foreground">{tile.label}</span>
            </div>
          ))}
        </div>
      </div>

      <AchievementsSection gameId={game.id} userId={session?.user?.id} />

      {topReviews.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold tracking-tight">{t("topReviewsTitle")}</h2>
          <div className="flex flex-col divide-y divide-border">
            {topReviews.map((review) => {
              const likeCount = review.likes.length;
              const isLiked = Boolean(
                session?.user && review.likes.some((like) => like.userId === session.user.id),
              );
              const canLike = Boolean(session?.user) && session?.user.id !== review.userId;

              return (
                <div key={review.id} className="flex flex-col gap-2 py-5">
                  <div className="flex items-center gap-2.5">
                    <Link
                      href={`/u/${review.user.username}`}
                      className="flex min-w-0 items-center gap-2.5"
                    >
                      <div className="relative size-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                        {review.user.image ? (
                          <Image
                            src={review.user.image}
                            alt=""
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <span className="truncate text-sm font-semibold hover:underline">
                        {review.user.name ?? `@${review.user.username}`}
                      </span>
                    </Link>
                    {review.rating != null ? (
                      <span className="shrink-0 text-sm font-semibold text-green-400">
                        {review.rating.toFixed(1)}/10
                      </span>
                    ) : null}

                    <div className="ml-auto flex shrink-0 items-center gap-3">
                      {canLike ? (
                        <LikeButton logId={review.id} initialLiked={isLiked} initialCount={likeCount} />
                      ) : likeCount > 0 ? (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <HeartIcon filled />
                          {likeCount}
                        </span>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(review.updatedAt, locale)}
                      </span>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-left text-sm text-muted-foreground">{review.notes}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
