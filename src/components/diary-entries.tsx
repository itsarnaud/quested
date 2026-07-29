import Image from "next/image";
import { Link } from "@/i18n/navigation";
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

export function DiaryEntries({
  logs,
  locale,
  statusLabel,
}: {
  logs: DiaryLogEntry[];
  locale: string;
  statusLabel: (status: GameStatus) => string;
}) {
  const monthFormatter = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" });
  const dayFormatter = new Intl.DateTimeFormat(locale, { day: "numeric" });
  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });

  const items: React.ReactNode[] = [];
  let lastMonthKey: string | null = null;

  for (const log of logs) {
    const date = new Date(log.date);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

    if (monthKey !== lastMonthKey) {
      lastMonthKey = monthKey;
      items.push(
        <h2 key={`month-${monthKey}`} className="py-4 text-sm font-medium text-muted-foreground first:pt-0">
          {monthFormatter.format(date)}
        </h2>,
      );
    }

    items.push(
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
              {statusLabel(log.status)}
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

  return <div className="flex flex-col divide-y divide-border">{items}</div>;
}
