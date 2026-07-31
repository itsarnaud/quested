import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { UserBadges } from "@/components/user-badges";
import { cn } from "@/lib/utils";
import type { Badge } from "@/generated/prisma/client";

export type LeaderboardEntry = {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  badges: Badge[];
  isViewer: boolean;
  value: string;
};

export function LeaderboardRow({
  rank,
  entry,
  youLabel,
}: {
  rank: number;
  entry: LeaderboardEntry;
  youLabel: string;
}) {
  return (
    <Link
      href={`/u/${entry.username}`}
      prefetch={false}
      className="flex items-center gap-4 py-4 transition-colors hover:bg-muted/50"
    >
      <span
        className={cn(
          "w-6 shrink-0 text-center text-sm font-semibold",
          rank <= 3 ? "text-accent" : "text-muted-foreground",
        )}
      >
        {rank}
      </span>
      <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
        {entry.image ? (
          <Image src={entry.image} alt={entry.name ?? entry.username ?? ""} fill unoptimized className="object-cover" />
        ) : null}
      </div>
      <span className="flex min-w-0 flex-1 items-center gap-1.5 font-semibold">
        <span className="truncate">{entry.name ?? entry.username}</span>
        <UserBadges badges={entry.badges} />
      </span>
      <span className="shrink-0 text-sm font-semibold">{entry.value}</span>
      {entry.isViewer ? (
        <span className="shrink-0 text-xs font-medium text-muted-foreground">{youLabel}</span>
      ) : null}
    </Link>
  );
}
