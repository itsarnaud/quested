import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LeaderboardRow, type LeaderboardEntry } from "@/components/leaderboard-row";

type PageProps = {
  params: Promise<{ locale: string }>;
};

const USER_SELECT = { id: true, username: true, name: true, image: true, badges: true } as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Leaderboard" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function LeaderboardPage({ params }: PageProps) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect({ href: "/login", locale });
    return;
  }

  const t = await getTranslations("Leaderboard");
  const userId = session.user.id;

  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const userIds = [userId, ...following.map((f) => f.followingId)];

  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: USER_SELECT });
  const userById = new Map(users.map((u) => [u.id, u]));

  if (following.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("noFollows")}</p>
      </div>
    );
  }

  const [completedCounts, ratingAverages] = await Promise.all([
    prisma.log.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, status: "COMPLETED" },
      _count: { userId: true },
    }),
    prisma.log.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  function toEntry(id: string, value: string): LeaderboardEntry {
    const user = userById.get(id);
    return {
      id,
      username: user?.username ?? null,
      name: user?.name ?? null,
      image: user?.image ?? null,
      badges: user?.badges ?? [],
      isViewer: id === userId,
      value,
    };
  }

  const completedBoard = userIds
    .map((id) => ({ id, count: completedCounts.find((c) => c.userId === id)?._count.userId ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .map(({ id, count }) => toEntry(id, t("gamesCompleted", { count })));

  const MIN_RATED_FOR_AVERAGE = 3;
  const ratingBoard = ratingAverages
    .filter((r) => r._count.rating >= MIN_RATED_FOR_AVERAGE)
    .sort((a, b) => (b._avg.rating ?? 0) - (a._avg.rating ?? 0))
    .map((r) => toEntry(r.userId, `${(r._avg.rating ?? 0).toFixed(1)}/10`));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t("completedTitle")}</h2>
        <div className="flex flex-col gap-2">
          {completedBoard.map((entry, i) => (
            <LeaderboardRow key={entry.id} rank={i + 1} entry={entry} youLabel={t("you")} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t("averageRatingTitle")}</h2>
        {ratingBoard.length > 0 ? (
          <div className="flex flex-col gap-2">
            {ratingBoard.map((entry, i) => (
              <LeaderboardRow key={entry.id} rank={i + 1} entry={entry} youLabel={t("you")} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("notEnoughRatings", { count: MIN_RATED_FOR_AVERAGE })}</p>
        )}
      </div>
    </div>
  );
}
