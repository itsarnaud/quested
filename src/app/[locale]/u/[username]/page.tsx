import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { GearIcon } from "@/components/icons/gear-icon";
import { HeartIcon } from "@/components/icons/heart-icon";
import { LikeButton } from "@/components/like-button";
import { FollowSection } from "@/app/[locale]/u/[username]/follow-section";

const STATUS_ORDER = ["COMPLETED", "PLAYING", "BACKLOG", "WISHLIST", "DROPPED"] as const;

const getUserProfile = cache((username: string) =>
  prisma.user.findUnique({
    where: { username },
    include: {
      logs: {
        include: { game: true, likes: { select: { userId: true } } },
        orderBy: { updatedAt: "desc" },
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

  const [user, session, t, tStatus] = await Promise.all([
    getUserProfile(username),
    auth(),
    getTranslations("Profile"),
    getTranslations("GameStatus"),
  ]);

  if (!user) notFound();

  const isOwnProfile = session?.user?.username === username;
  const canLike = Boolean(session?.user) && !isOwnProfile;

  const logsByStatus = STATUS_ORDER.map((status) => ({
    status,
    logs: user.logs.filter((log) => log.status === status),
  })).filter((group) => group.logs.length > 0);

  const reviews = user.logs.filter((log) => log.notes);

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
            <h1 className="text-xl font-semibold tracking-tight">{user.name ?? username}</h1>
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

      {logsByStatus.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noGames")}</p>
      ) : (
        <div className="flex flex-col gap-8">
          {logsByStatus.map((group) => (
            <div key={group.status} className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                {tStatus(group.status)} · {group.logs.length}
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
                {group.logs.map((log) => (
                  <Link
                    key={log.id}
                    href={`/games/${log.game.slug}`}
                    className="flex flex-col gap-2 hover:opacity-90"
                    title={log.notes ?? undefined}
                  >
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md border border-border bg-muted">
                      {log.game.coverUrl ? (
                        <Image
                          src={log.game.coverUrl}
                          alt={log.game.title}
                          fill
                          sizes="(max-width: 768px) 45vw, 160px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-col">
                      <span className="truncate text-sm font-medium">{log.game.title}</span>
                      {log.rating != null ? (
                        <span className="text-xs text-muted-foreground">{log.rating.toFixed(1)}/10</span>
                      ) : null}
                      {log.notes ? (
                        <span className="truncate text-xs text-muted-foreground">{log.notes}</span>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {reviews.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t("reviewsTitle")} · {reviews.length}
          </h2>
          <div className="flex flex-col divide-y divide-border">
            {reviews.map((log) => {
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
