import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LogControls } from "@/components/log-controls";
import { LikeButton } from "@/components/like-button";
import { HeartIcon } from "@/components/icons/heart-icon";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const getGame = cache((slug: string) => prisma.game.findUnique({ where: { slug } }));

const TOP_REVIEWS_LIMIT = 3;

type PageProps = {
  params: Promise<{ slug: string; locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGame(slug);
  if (!game) return {};

  const title = game.releaseYear ? `${game.title} (${game.releaseYear})` : game.title;

  return {
    title,
    description: game.summary ?? undefined,
    openGraph: game.coverUrl ? { images: [{ url: game.coverUrl }] } : undefined,
  };
}

export default async function GamePage({ params }: PageProps) {
  const { slug } = await params;
  const [game, session, t, tStatus] = await Promise.all([
    getGame(slug),
    auth(),
    getTranslations("GamePage"),
    getTranslations("GameStatus"),
  ]);

  if (!game) notFound();

  const isUnreleased = Boolean(game.releaseYear && game.releaseYear > new Date().getFullYear());

  const [ratingStats, topReviews] = await Promise.all([
    prisma.log.aggregate({
      where: { gameId: game.id, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    }),
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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <div className="mx-auto w-40 shrink-0 sm:mx-0 sm:w-48">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md border border-border bg-muted">
            {game.coverUrl ? (
              <Image src={game.coverUrl} alt={game.title} fill sizes="(max-width: 640px) 160px, 192px" className="object-cover" />
            ) : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-6 text-center sm:text-left">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{game.title}</h1>
            {game.releaseYear ? (
              <p className="text-sm text-muted-foreground">{game.releaseYear}</p>
            ) : null}
            {ratingStats._count.rating > 0 ? (
              <p className="text-sm text-muted-foreground">
                {(ratingStats._avg.rating ?? 0).toFixed(1)}/10 ({ratingStats._count.rating})
              </p>
            ) : null}
          </div>

          {game.summary ? <p className="text-sm text-muted-foreground">{game.summary}</p> : null}

          {session?.user ? (
            <LogControls gameId={game.id} isUnreleased={isUnreleased} />
          ) : (
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <p className="text-sm text-muted-foreground">{t("signInPrompt")}</p>
              <Link href="/login">
                <Button variant="secondary">{t("signIn")}</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {topReviews.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">{t("topReviewsTitle")}</h2>
          <div className="flex flex-col divide-y divide-border">
            {topReviews.map((review) => {
              const likeCount = review.likes.length;
              const isLiked = Boolean(
                session?.user && review.likes.some((like) => like.userId === session.user.id),
              );
              const canLike = Boolean(session?.user) && session?.user.id !== review.userId;

              return (
                <div key={review.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/u/${review.user.username}`} className="text-sm hover:underline">
                      <span className="font-medium">@{review.user.username}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {tStatus(review.status)}
                        {review.rating != null ? ` · ${review.rating.toFixed(1)}/10` : ""}
                      </span>
                    </Link>

                    {canLike ? (
                      <LikeButton logId={review.id} initialLiked={isLiked} initialCount={likeCount} />
                    ) : likeCount > 0 ? (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <HeartIcon filled />
                        {likeCount}
                      </span>
                    ) : null}
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
