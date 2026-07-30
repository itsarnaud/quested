import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { Pagination } from "@/components/pagination";
import { LikedLogRow } from "@/components/liked-log-row";

const PAGE_SIZE = 20;

type PageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const t = await getTranslations("Profile");
  return { title: `${t("likesTab")} — @${username}` };
}

export default async function LikesPage({ params, searchParams }: PageProps) {
  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) notFound();

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [likes, total, t, tStatus, session] = await Promise.all([
    prisma.like.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        log: {
          include: {
            game: true,
            user: { select: { username: true, name: true, badges: true } },
            likes: { select: { userId: true } },
          },
        },
      },
    }),
    prisma.like.count({ where: { userId: user.id } }),
    getTranslations("Profile"),
    getTranslations("GameStatus"),
    auth(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <Link href={`/u/${username}`} className="w-fit text-sm text-muted-foreground hover:text-foreground">
        ← {t("backToProfile")}
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">{t("likesTab")}</h1>

      {likes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noLikes")}</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {likes.map(({ log }) => {
            const likeCount = log.likes.length;
            const isLiked = Boolean(
              session?.user && log.likes.some((like) => like.userId === session.user.id),
            );
            const canLikeThis = Boolean(session?.user) && session?.user.id !== log.userId;

            return (
              <LikedLogRow
                key={log.id}
                log={{
                  id: log.id,
                  gameSlug: log.game.slug,
                  gameTitle: log.game.title,
                  gameReleaseYear: log.game.releaseYear,
                  coverUrl: log.game.coverUrl,
                  rating: log.rating,
                  notes: log.notes,
                  userUsername: log.user.username,
                  userName: log.user.name,
                  userBadges: log.user.badges,
                }}
                statusLabel={tStatus(log.status)}
                canLike={canLikeThis}
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
        buildHref={(p) => (p === 1 ? `/u/${username}/likes` : `/u/${username}/likes?page=${p}`)}
      />
    </div>
  );
}
