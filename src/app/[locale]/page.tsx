import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/game-card";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return <MarketingHome />;
  }

  return <Feed userId={session.user.id} />;
}

async function MarketingHome() {
  const t = await getTranslations("Home");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-md flex-col gap-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Quested</h1>
        <p className="text-muted-foreground">{t("tagline")}</p>
        <div className="flex justify-center gap-3">
          <Link href="/search">
            <Button>{t("getStarted")}</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary">{t("signIn")}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

async function Feed({ userId }: { userId: string }) {
  const t = await getTranslations("Home");
  const tStatus = await getTranslations("GameStatus");

  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);

  const [activity, popularGames, newGames] = await Promise.all([
    followingIds.length > 0
      ? prisma.log.findMany({
          where: { userId: { in: followingIds } },
          include: { game: true, user: true },
          orderBy: { updatedAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
    prisma.game.findMany({
      orderBy: { logs: { _count: "desc" } },
      take: 12,
    }),
    prisma.game.findMany({
      where: { releaseYear: { not: null } },
      orderBy: { releaseYear: "desc" },
      take: 12,
    }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-10">
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t("activityTitle")}</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noActivity")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {activity.map((log) => (
              <Link
                key={log.id}
                href={`/games/${log.game.slug}`}
                className="flex items-center gap-3 rounded-md border border-border p-3 hover:bg-muted"
              >
                <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded border border-border bg-muted">
                  {log.game.coverUrl ? (
                    <Image
                      src={log.game.coverUrl}
                      alt={log.game.title}
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex flex-col text-sm">
                  <span>
                    <span className="font-medium">@{log.user.username}</span>{" "}
                    <span className="text-muted-foreground">
                      · {tStatus(log.status)}
                      {log.rating ? ` · ${log.rating}/10` : ""}
                    </span>
                  </span>
                  <span className="font-medium">{log.game.title}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t("popularTitle")}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {popularGames.map((game) => (
            <GameCard
              key={game.id}
              slug={game.slug}
              title={game.title}
              releaseYear={game.releaseYear}
              coverUrl={game.coverUrl}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t("newTitle")}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {newGames.map((game) => (
            <GameCard
              key={game.id}
              slug={game.slug}
              title={game.title}
              releaseYear={game.releaseYear}
              coverUrl={game.coverUrl}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
