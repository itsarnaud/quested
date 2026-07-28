import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { GearIcon } from "@/components/icons/gear-icon";
import { FollowSection } from "@/app/[locale]/u/[username]/follow-section";

const STATUS_ORDER = ["PLAYING", "COMPLETED", "BACKLOG", "WISHLIST", "DROPPED"] as const;

const getUserProfile = cache((username: string) =>
  prisma.user.findUnique({
    where: { username },
    include: {
      logs: {
        include: { game: true },
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
    description: `${user.name ?? username}'s game library on Quested.`,
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

  const logsByStatus = STATUS_ORDER.map((status) => ({
    status,
    logs: user.logs.filter((log) => log.status === status),
  })).filter((group) => group.logs.length > 0);

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
              className="rounded-full"
            />
          ) : null}
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{user.name ?? username}</h1>
            <p className="text-sm text-muted-foreground">@{username}</p>
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

      <FollowSection username={username} showButton={Boolean(session?.user) && !isOwnProfile} />

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
                  <div key={log.id} className="flex flex-col gap-2">
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
                      {log.rating ? (
                        <span className="text-xs text-muted-foreground">{log.rating}/10</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
