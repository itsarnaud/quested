import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { GearIcon } from "@/components/icons/gear-icon";
import { HeartIcon } from "@/components/icons/heart-icon";
import { LikeButton } from "@/components/like-button";
import { FollowSection } from "@/app/[locale]/u/[username]/follow-section";
import { ProfileTabs } from "@/app/[locale]/u/[username]/profile-tabs";
import { FavoriteGamesSection } from "@/app/[locale]/u/[username]/favorite-games-section";
import { TasteComparison } from "@/app/[locale]/u/[username]/taste-comparison";
import { PaginatedGameGrid } from "@/app/[locale]/u/[username]/paginated-game-grid";
import { ShowMoreList } from "@/app/[locale]/u/[username]/show-more-list";
import { DiaryTab, type DiaryLogEntry } from "@/app/[locale]/u/[username]/diary-tab";
import { UserBadges } from "@/components/user-badges";
import { GameListsSection } from "@/app/[locale]/u/[username]/game-lists-section";

const STATUS_ORDER = ["COMPLETED", "PLAYING", "BACKLOG", "WISHLIST", "DROPPED"] as const;

const getUserProfile = cache((username: string) =>
  prisma.user.findUnique({
    where: { username },
    include: {
      logs: {
        include: { game: true, likes: { select: { userId: true } } },
        orderBy: { updatedAt: "desc" },
      },
      favoriteGames: {
        orderBy: { position: "asc" },
      },
    },
  }),
);

type PageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const user = await getUserProfile(username);
  if (!user) return {};

  return {
    title: `${user.name ?? username} (@${username})`,
    description: user.bio ?? `${user.name ?? username}'s game library on Quested.`,
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;

  const [user, session, t, tStatus, locale] = await Promise.all([
    getUserProfile(username),
    auth(),
    getTranslations("Profile"),
    getTranslations("GameStatus"),
    getLocale(),
  ]);

  if (!user) notFound();

  const logByGameId = new Map(user.logs.map((log) => [log.gameId, log]));
  const favoriteGames = user.favoriteGames
    .map((fg) => logByGameId.get(fg.gameId))
    .filter((log): log is (typeof user.logs)[number] => Boolean(log))
    .map((log) => ({
      id: log.game.id,
      slug: log.game.slug,
      title: log.game.title,
      coverUrl: log.game.coverUrl,
      rating: log.rating,
      notes: log.notes,
    }));

  const likedByUser = await prisma.like.findMany({
    where: { userId: user.id },
    include: {
      log: {
        include: {
          game: true,
          user: { select: { username: true, name: true, badges: true } },
          likes: { select: { userId: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const isOwnProfile = session?.user?.username === username;
  const canLike = Boolean(session?.user) && !isOwnProfile;

  const logsByStatus = STATUS_ORDER.map((status) => ({
    status,
    logs: user.logs.filter((log) => log.status === status),
  })).filter((group) => group.logs.length > 0);

  const reviews = user.logs.filter((log) => log.notes);

  const gamesContent =
    logsByStatus.length === 0 ? (
      <p className="text-sm text-muted-foreground">{t("noGames")}</p>
    ) : (
      <div className="flex flex-col gap-8">
        {logsByStatus.map((group) => (
          <div key={group.status} className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              {tStatus(group.status)} · {group.logs.length}
            </h2>
            <PaginatedGameGrid
              games={group.logs.map((log) => ({
                id: log.id,
                slug: log.game.slug,
                title: log.game.title,
                coverUrl: log.game.coverUrl,
                rating: log.rating,
                notes: log.notes,
              }))}
            />
          </div>
        ))}
      </div>
    );

  const reviewsContent =
    reviews.length === 0 ? (
      <p className="text-sm text-muted-foreground">{t("noReviews")}</p>
    ) : (
      <ShowMoreList
        items={reviews.map((log) => {
          const likeCount = log.likes.length;
          const isLiked = Boolean(
            session?.user && log.likes.some((like) => like.userId === session.user.id),
          );

          return (
            <div key={log.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
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
                    <span className="text-sm text-muted-foreground">
                      {tStatus(log.status)}
                      {log.rating != null ? ` · ${log.rating.toFixed(1)}/10` : ""}
                    </span>
                  </div>
                </Link>

                {canLike ? (
                  <LikeButton logId={log.id} initialLiked={isLiked} initialCount={likeCount} />
                ) : likeCount > 0 ? (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <HeartIcon filled />
                    {likeCount}
                  </span>
                ) : null}
              </div>

              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{log.notes}</p>
            </div>
          );
        })}
      />
    );

  const diaryLogs: DiaryLogEntry[] = [...user.logs]
    .sort((a, b) => {
      const dateA = (a.finishedAt ?? a.updatedAt).getTime();
      const dateB = (b.finishedAt ?? b.updatedAt).getTime();
      return dateB - dateA;
    })
    .map((log) => ({
      id: log.id,
      gameSlug: log.game.slug,
      gameTitle: log.game.title,
      coverUrl: log.game.coverUrl,
      status: log.status,
      rating: log.rating,
      notes: log.notes,
      date: (log.finishedAt ?? log.updatedAt).toISOString(),
    }));

  const diaryContent = <DiaryTab logs={diaryLogs} locale={locale} />;

  const likesContent =
    likedByUser.length === 0 ? (
      <p className="text-sm text-muted-foreground">{t("noLikes")}</p>
    ) : (
      <ShowMoreList
        items={likedByUser.map(({ log }) => {
          const likeCount = log.likes.length;
          const isLiked = Boolean(
            session?.user && log.likes.some((like) => like.userId === session.user.id),
          );
          const canLikeThis = Boolean(session?.user) && session?.user.id !== log.userId;

          return (
            <div key={log.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <Link href={`/u/${log.user.username}`} className="text-sm hover:underline">
                  <span className="font-medium">{log.user.name ?? log.user.username}</span>{" "}
                  <UserBadges badges={log.user.badges} />
                  <span className="text-muted-foreground">
                    {" "}
                    @{log.user.username} · {tStatus(log.status)}
                    {log.rating != null ? ` · ${log.rating.toFixed(1)}/10` : ""}
                  </span>
                </Link>

                {canLikeThis ? (
                  <LikeButton logId={log.id} initialLiked={isLiked} initialCount={likeCount} />
                ) : likeCount > 0 ? (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <HeartIcon filled />
                    {likeCount}
                  </span>
                ) : null}
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
          );
        })}
      />
    );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name ?? username}
              width={56}
              height={56}
              unoptimized
              className="rounded-full"
            />
          ) : null}
          <div>
            <div className="flex items-center justify-center gap-1.5 sm:justify-start">
              <h1 className="text-xl font-semibold tracking-tight">{user.name ?? username}</h1>
              <UserBadges badges={user.badges} />
            </div>
            <p className="text-sm text-muted-foreground">@{username}</p>
            {user.bio ? <p className="mt-1 text-sm">{user.bio}</p> : null}
          </div>
        </div>
        {isOwnProfile ? (
          <div className="flex items-center gap-4">
            <div className="hidden h-10 w-px bg-border sm:block" aria-hidden="true" />
            <Link
              href="/account"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <GearIcon />
              {t("settings")}
            </Link>
          </div>
        ) : null}
      </div>

      <FollowSection
        username={username}
        isLoggedIn={Boolean(session?.user)}
        isOwnProfile={isOwnProfile}
      />

      {!isOwnProfile && session?.user ? <TasteComparison username={username} /> : null}

      <FavoriteGamesSection
        initialFavorites={favoriteGames}
        canEdit={isOwnProfile}
      />

      <ProfileTabs
        gamesLabel={t("gamesTab")}
        diaryLabel={t("diaryTab")}
        reviewsLabel={t("reviewsTab")}
        likesLabel={t("likesTab")}
        listsLabel={t("listsTab")}
        gamesContent={gamesContent}
        diaryContent={diaryContent}
        reviewsContent={reviewsContent}
        likesContent={likesContent}
        listsContent={<GameListsSection username={username} canEdit={isOwnProfile} />}
      />
    </div>
  );
}
