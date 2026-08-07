import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Prisma, type GameStatus } from "@/generated/prisma/client";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/pagination";
import { DiaryEntries, type DiaryLogEntry } from "@/components/diary-entries";
import { EmptyState } from "@/components/empty-state";
import { pageAlternates } from "@/lib/alternates";

const PAGE_SIZE = 20;

type PageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string; year?: string }>;
};

type DiaryRow = {
  id: string;
  status: GameStatus;
  rating: number | null;
  notes: string | null;
  effectiveDate: Date;
  gameSlug: string;
  gameTitle: string;
  coverUrl: string | null;
};

async function getDiaryPage(userId: string, page: number, year: number | null) {
  const skip = (page - 1) * PAGE_SIZE;
  const yearFilter = year
    ? Prisma.sql`AND EXTRACT(YEAR FROM COALESCE(l."finishedAt", l."updatedAt")) = ${year}`
    : Prisma.empty;

  const [rows, countRows, yearRows] = await Promise.all([
    prisma.$queryRaw<DiaryRow[]>(Prisma.sql`
      SELECT l.id, l.status, l.rating, l.notes,
             COALESCE(l."finishedAt", l."updatedAt") AS "effectiveDate",
             g.slug AS "gameSlug", g.title AS "gameTitle", g."coverUrl" AS "coverUrl"
      FROM "Log" l
      JOIN "Game" g ON g.id = l."gameId"
      WHERE l."userId" = ${userId}
      ${yearFilter}
      ORDER BY COALESCE(l."finishedAt", l."updatedAt") DESC
      LIMIT ${PAGE_SIZE} OFFSET ${skip}
    `),
    prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM "Log" l
      WHERE l."userId" = ${userId}
      ${yearFilter}
    `),
    prisma.$queryRaw<Array<{ year: number }>>(Prisma.sql`
      SELECT DISTINCT EXTRACT(YEAR FROM COALESCE(l."finishedAt", l."updatedAt"))::int AS year
      FROM "Log" l
      WHERE l."userId" = ${userId}
      ORDER BY year DESC
    `),
  ]);

  return {
    rows,
    total: Number(countRows[0]?.count ?? 0),
    years: yearRows.map((r) => r.year),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const [t, locale] = await Promise.all([getTranslations("Profile"), getLocale()]);
  return {
    title: `${t("diaryTab")} — @${username}`,
    alternates: pageAlternates(locale, `/u/${username}/diary`),
  };
}

export default async function DiaryPage({ params, searchParams }: PageProps) {
  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) notFound();

  const { page: pageParam, year: yearParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const year = yearParam ? Number(yearParam) : null;

  const [{ rows, total, years }, t, tStatus, locale] = await Promise.all([
    getDiaryPage(user.id, page, year),
    getTranslations("Profile"),
    getTranslations("GameStatus"),
    getLocale(),
  ]);

  const logs: DiaryLogEntry[] = rows.map((row) => ({
    id: row.id,
    gameSlug: row.gameSlug,
    gameTitle: row.gameTitle,
    coverUrl: row.coverUrl,
    status: row.status,
    rating: row.rating,
    notes: row.notes,
    date: row.effectiveDate.toISOString(),
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(p: number) {
    const query = new URLSearchParams();
    if (year) query.set("year", String(year));
    if (p > 1) query.set("page", String(p));
    const qs = query.toString();
    return `/u/${username}/diary${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <Link href={`/u/${username}`} className="w-fit text-sm text-muted-foreground hover:text-foreground">
        ← {t("backToProfile")}
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">{t("diaryTab")}</h1>

      {years.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/u/${username}/diary`}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              !year ? "border-accent bg-accent text-white" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {t("allYears")}
          </Link>
          {years.map((y) => (
            <Link
              key={y}
              href={`/u/${username}/diary?year=${y}`}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                year === y ? "border-accent bg-accent text-white" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {y}
            </Link>
          ))}
        </div>
      ) : null}

      {logs.length === 0 ? (
        <EmptyState title={t("noDiaryEntries")} subtitle={t("noDiaryEntriesSubtitle")} />
      ) : (
        <DiaryEntries logs={logs} locale={locale} statusLabel={tStatus} />
      )}

      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
