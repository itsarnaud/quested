import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { GameTile } from "@/components/game-tile";
import { Pagination } from "@/components/pagination";
import { statusFromSlug } from "@/lib/game-status";

const PAGE_SIZE = 24;

type PageProps = {
  params: Promise<{ username: string; status: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username, status: statusSlug } = await params;
  const status = statusFromSlug(statusSlug);
  if (!status) return {};
  const tStatus = await getTranslations("GameStatus");
  return { title: `${tStatus(status)} — @${username}` };
}

export default async function GamesByStatusPage({ params, searchParams }: PageProps) {
  const { username, status: statusSlug } = await params;
  const status = statusFromSlug(statusSlug);
  if (!status) notFound();

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) notFound();

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [logs, total, t, tStatus] = await Promise.all([
    prisma.log.findMany({
      where: { userId: user.id, status },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { game: true },
    }),
    prisma.log.count({ where: { userId: user.id, status } }),
    getTranslations("Profile"),
    getTranslations("GameStatus"),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <Link href={`/u/${username}`} className="w-fit text-sm text-muted-foreground hover:text-foreground">
        ← {t("backToProfile")}
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">
        {tStatus(status)} · {total}
      </h1>

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noGames")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {logs.map((log) => (
            <GameTile
              key={log.id}
              game={{
                id: log.id,
                slug: log.game.slug,
                title: log.game.title,
                coverUrl: log.game.coverUrl,
                rating: log.rating,
                notes: log.notes,
              }}
            />
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(p) => (p === 1 ? `/u/${username}/games/${statusSlug}` : `/u/${username}/games/${statusSlug}?page=${p}`)}
      />
    </div>
  );
}
