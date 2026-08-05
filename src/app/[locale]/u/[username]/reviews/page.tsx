import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { Pagination } from "@/components/pagination";
import { ReviewRow } from "@/components/review-row";
import { EmptyState } from "@/components/empty-state";
import { pageAlternates } from "@/lib/alternates";

const PAGE_SIZE = 20;

type PageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const [t, locale] = await Promise.all([getTranslations("Profile"), getLocale()]);
  return {
    title: `${t("reviewsTab")} — @${username}`,
    alternates: pageAlternates(locale, `/u/${username}/reviews`),
  };
}

export default async function ReviewsPage({ params, searchParams }: PageProps) {
  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) notFound();

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [logs, total, t, tStatus, session] = await Promise.all([
    prisma.log.findMany({
      where: { userId: user.id, notes: { not: null } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { game: true, likes: { select: { userId: true } } },
    }),
    prisma.log.count({ where: { userId: user.id, notes: { not: null } } }),
    getTranslations("Profile"),
    getTranslations("GameStatus"),
    auth(),
  ]);

  const isOwnProfile = session?.user?.username === username;
  const canLike = Boolean(session?.user) && !isOwnProfile;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <Link href={`/u/${username}`} className="w-fit text-sm text-muted-foreground hover:text-foreground">
        ← {t("backToProfile")}
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">{t("reviewsTab")}</h1>

      {logs.length === 0 ? (
        <EmptyState title={t("noReviews")} subtitle={t("noReviewsSubtitle")} />
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {logs.map((log) => {
            const likeCount = log.likes.length;
            const isLiked = Boolean(
              session?.user && log.likes.some((like) => like.userId === session.user.id),
            );

            return (
              <ReviewRow
                key={log.id}
                log={{
                  id: log.id,
                  gameSlug: log.game.slug,
                  gameTitle: log.game.title,
                  coverUrl: log.game.coverUrl,
                  rating: log.rating,
                  notes: log.notes,
                }}
                statusLabel={tStatus(log.status)}
                canLike={canLike}
                isLiked={isLiked}
                likeCount={likeCount}
              />
            );
          })}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(p) => (p === 1 ? `/u/${username}/reviews` : `/u/${username}/reviews?page=${p}`)}
      />
    </div>
  );
}
