import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { GearIcon } from "@/components/icons/gear-icon";
import { ReviewRow } from "@/components/review-row";
import { LikedLogRow } from "@/components/liked-log-row";
import { DiaryEntries, type DiaryLogEntry } from "@/components/diary-entries";
import { FollowSection } from "@/app/[locale]/u/[username]/follow-section";
import { Tabs, TabPanel } from "@/components/tabs";
import { FavoriteGamesSection } from "@/app/[locale]/u/[username]/favorite-games-section";
import { TasteComparison } from "@/app/[locale]/u/[username]/taste-comparison";
import { ProfileGameGrid } from "@/app/[locale]/u/[username]/profile-game-grid";
import { UserBadges } from "@/components/user-badges";
import { GameListsSection } from "@/app/[locale]/u/[username]/game-lists-section";
import { STATUS_SLUGS } from "@/lib/game-status";
import { pageAlternates } from "@/lib/alternates";
import { RatingHistogram } from "@/components/rating-histogram";
import { GameTile } from "@/components/game-tile";

const STATUS_ORDER = ["COMPLETED", "PLAYING", "BACKLOG", "WISHLIST", "DROPPED"] as const;
const PREVIEW_SIZE = 12;

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
  const [user, locale, t] = await Promise.all([
    getUserProfile(username),
    getLocale(),
    getTranslations("Profile"),
  ]);
  if (!user) return {};

  const title = `${user.name ?? username} (@${username})`;
  const description = user.bio ?? t("metaDescription", { name: user.name ?? username });
  const images = user.image ? [{ url: user.image }] : undefined;

  return {
    title,
    description,
    alternates: pageAlternates(locale, `/u/${username}`),
    openGraph: { title, description, images, type: "profile" },
    twitter: { title, description, images, card: images ? "summary" : "summary" },
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
    take: PREVIEW_SIZE,
  });

  const likedCount = await prisma.like.count({ where: { userId: user.id } });
  const ownedListsCount = await prisma.gameList.count({ where: { userId: user.id } });

  const isOwnProfile = session?.user?.username === username;
  const canLike = Boolean(session?.user) && !isOwnProfile;

  const logsByStatus = STATUS_ORDER.map((status) => ({
    status,
    logs: user.logs.filter((log) => log.status === status),
  })).filter((group) => group.logs.length > 0);

  const reviews = user.logs.filter((log) => log.notes);

  const personalRatings = user.logs.filter((log) => log.rating != null).map((log) => log.rating!);
  const personalAverageRating =
    personalRatings.length > 0 ? personalRatings.reduce((sum, r) => sum + r, 0) / personalRatings.length : null;
  const currentYear = new Date().getFullYear();
  const completedThisYear = user.logs.filter(
    (log) => log.status === "COMPLETED" && (log.finishedAt ?? log.updatedAt).getFullYear() === currentYear,
  ).length;
  const backlogCount = user.logs.filter((log) => log.status === "BACKLOG").length;
  const completedCount = user.logs.filter((log) => log.status === "COMPLETED").length;
  const playingCount = user.logs.filter((log) => log.status === "PLAYING").length;

  const recentlyPlayed = [...user.logs]
    .filter((log) => log.status === "COMPLETED")
    .sort((a, b) => (b.finishedAt ?? b.updatedAt).getTime() - (a.finishedAt ?? a.updatedAt).getTime())
    .slice(0, 6)
    .map((log) => ({
      id: log.game.id,
      slug: log.game.slug,
      title: log.game.title,
      coverUrl: log.game.coverUrl,
      rating: log.rating,
      notes: log.notes,
    }));

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
            <ProfileGameGrid
              games={group.logs.map((log) => ({
                id: log.id,
                slug: log.game.slug,
                title: log.game.title,
                coverUrl: log.game.coverUrl,
                rating: log.rating,
                notes: log.notes,
              }))}
              moreHref={`/u/${username}/games/${STATUS_SLUGS[group.status]}`}
              moreLabel={t("showMore")}
            />
          </div>
        ))}
      </div>
    );

  const reviewsContent =
    reviews.length === 0 ? (
      <p className="text-sm text-muted-foreground">{t("noReviews")}</p>
    ) : (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col divide-y divide-border">
          {reviews.slice(0, PREVIEW_SIZE).map((log) => {
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
        {reviews.length > PREVIEW_SIZE ? (
          <Link href={`/u/${username}/reviews`} className="w-fit text-sm text-muted-foreground hover:text-foreground">
            {t("showMore")}
          </Link>
        ) : null}
      </div>
    );

  const diaryLogs: DiaryLogEntry[] = [...user.logs]
    .sort((a, b) => {
      const dateA = (a.finishedAt ?? a.updatedAt).getTime();
      const dateB = (b.finishedAt ?? b.updatedAt).getTime();
      return dateB - dateA;
    })
    .slice(0, PREVIEW_SIZE)
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

  const diaryContent =
    diaryLogs.length === 0 ? (
      <p className="text-sm text-muted-foreground">{t("noDiaryEntries")}</p>
    ) : (
      <div className="flex flex-col gap-4">
        <DiaryEntries logs={diaryLogs} locale={locale} statusLabel={tStatus} />
        {user.logs.length > PREVIEW_SIZE ? (
          <Link href={`/u/${username}/diary`} className="w-fit text-sm text-muted-foreground hover:text-foreground">
            {t("showMore")}
          </Link>
        ) : null}
      </div>
    );

  const likesContent =
    likedByUser.length === 0 ? (
      <p className="text-sm text-muted-foreground">{t("noLikes")}</p>
    ) : (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col divide-y divide-border">
          {likedByUser.map(({ log }) => {
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
        {likedCount > PREVIEW_SIZE ? (
          <Link href={`/u/${username}/likes`} className="w-fit text-sm text-muted-foreground hover:text-foreground">
            {t("showMore")}
          </Link>
        ) : null}
      </div>
    );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-5">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted sm:size-24">
            {user.image ? (
              <Image src={user.image} alt={user.name ?? username} fill unoptimized className="object-cover" />
            ) : null}
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight">{user.name ?? username}</h1>
              <UserBadges badges={user.badges} />
              {isOwnProfile ? (
                <Link
                  href="/account"
                  aria-label={t("settings")}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <GearIcon />
                </Link>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">@{username}</p>
            {user.bio ? <p className="text-sm text-muted-foreground">{user.bio}</p> : null}
          </div>
        </div>

        {user.logs.length > 0 ? (
          <div className="flex shrink-0 gap-8 lg:pt-2">
            {[
              { label: t("statsCompleted"), count: completedCount },
              { label: t("statsPlaying"), count: playingCount },
              { label: t("statsReviews"), count: reviews.length },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-0.5 text-center">
                <span className="text-2xl font-bold tracking-tight">{stat.count}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </span>
              </div>
            ))}
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

      {user.logs.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
          <RatingHistogram
            averageRating={personalAverageRating}
            ratingCount={personalRatings.length}
            ratings={personalRatings}
            ratingLabel={t("statsAvgRating")}
          />
          <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
            {[
              { label: t("statsTotalGames"), count: user.logs.length },
              { label: t("statsPlayedThisYear"), count: completedThisYear },
              { label: t("statsBacklog"), count: backlogCount },
              { label: t("statsReviews"), count: reviews.length },
              { label: t("statsLists"), count: ownedListsCount },
            ].map((tile) => (
              <div key={tile.label} className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-md border border-border p-3 text-center">
                <span className="text-lg font-semibold tracking-tight">{tile.count}</span>
                <span className="text-xs text-muted-foreground">{tile.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {recentlyPlayed.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("recentlyPlayedTitle")}
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-6 sm:overflow-visible sm:pb-0">
            {recentlyPlayed.map((game) => (
              <div key={game.id} className="w-28 shrink-0 sm:w-auto">
                <GameTile game={game} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Tabs defaultTab="games">
        <TabPanel key="games" tabKey="games" label={t("gamesTab")}>
          {gamesContent}
        </TabPanel>
        <TabPanel key="diary" tabKey="diary" label={t("diaryTab")}>
          {diaryContent}
        </TabPanel>
        <TabPanel key="reviews" tabKey="reviews" label={t("reviewsTab")}>
          {reviewsContent}
        </TabPanel>
        <TabPanel key="likes" tabKey="likes" label={t("likesTab")}>
          {likesContent}
        </TabPanel>
        <TabPanel key="lists" tabKey="lists" label={t("listsTab")}>
          <GameListsSection username={username} canEdit={isOwnProfile} />
        </TabPanel>
      </Tabs>
    </div>
  );
}
