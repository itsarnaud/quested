"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ShowMoreList } from "@/app/[locale]/u/[username]/show-more-list";
import type { GameStatus } from "@/generated/prisma/client";

export type DiaryLogEntry = {
  id: string;
  gameSlug: string;
  gameTitle: string;
  coverUrl: string | null;
  status: GameStatus;
  rating: number | null;
  notes: string | null;
  date: string;
};

export function DiaryTab({ logs, locale }: { logs: DiaryLogEntry[]; locale: string }) {
  const t = useTranslations("Profile");
  const tStatus = useTranslations("GameStatus");
  const [year, setYear] = useState<string>("all");

  const years = useMemo(() => {
    const set = new Set(logs.map((log) => new Date(log.date).getFullYear()));
    return [...set].sort((a, b) => b - a);
  }, [logs]);

  const filtered = useMemo(
    () => (year === "all" ? logs : logs.filter((log) => new Date(log.date).getFullYear() === Number(year))),
    [logs, year],
  );

  const { monthFormatter, dayFormatter, weekdayFormatter } = useMemo(
    () => ({
      monthFormatter: new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }),
      dayFormatter: new Intl.DateTimeFormat(locale, { day: "numeric" }),
      weekdayFormatter: new Intl.DateTimeFormat(locale, { weekday: "short" }),
    }),
    [locale],
  );

  const items = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    let lastMonthKey: string | null = null;

    for (const log of filtered) {
      const date = new Date(log.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

      if (monthKey !== lastMonthKey) {
        lastMonthKey = monthKey;
        nodes.push(
          <h2 key={`month-${monthKey}`} className="py-4 text-sm font-medium text-muted-foreground first:pt-0">
            {monthFormatter.format(date)}
          </h2>,
        );
      }

      nodes.push(
        <div key={log.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
          <div className="w-10 shrink-0 text-center">
            <div className="text-xs uppercase text-muted-foreground">{weekdayFormatter.format(date)}</div>
            <div className="text-lg font-semibold tracking-tight">{dayFormatter.format(date)}</div>
          </div>
          <Link href={`/games/${log.gameSlug}`} className="flex min-w-0 flex-1 gap-3 hover:opacity-90">
            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded border border-border bg-muted">
              {log.coverUrl ? (
                <Image src={log.coverUrl} alt={log.gameTitle} fill sizes="48px" className="object-cover" />
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col justify-center">
              <span className="truncate font-medium">{log.gameTitle}</span>
              <span className="text-sm text-muted-foreground">
                {tStatus(log.status)}
                {log.rating != null ? ` · ${log.rating.toFixed(1)}/10` : ""}
              </span>
              {log.notes ? (
                <span className="mt-0.5 truncate text-sm italic text-muted-foreground">{log.notes}</span>
              ) : null}
            </div>
          </Link>
        </div>,
      );
    }

    return nodes;
  }, [filtered, monthFormatter, dayFormatter, weekdayFormatter, tStatus]);

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noDiaryEntries")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {years.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setYear("all")}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              year === "all" ? "border-accent bg-accent text-white" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {t("allYears")}
          </button>
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(String(y))}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                year === String(y) ? "border-accent bg-accent text-white" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {y}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noDiaryEntries")}</p>
      ) : (
        <ShowMoreList items={items} />
      )}
    </div>
  );
}
