import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { UserBadges } from "@/components/user-badges";
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
      className="flex items-center gap-3 rounded-md border border-border p-3 hover:bg-muted"
    >
      <span className="w-6 shrink-0 text-center text-sm font-medium text-muted-foreground">{rank}</span>
      <div className="relative size-9 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
        {entry.image ? (
          <Image src={entry.image} alt={entry.name ?? entry.username ?? ""} fill unoptimized className="object-cover" />
        ) : null}
      </div>
      <span className="flex min-w-0 flex-1 items-center gap-1 text-sm font-medium">
        <span className="truncate">{entry.name ?? entry.username}</span>
        <UserBadges badges={entry.badges} />
        {entry.isViewer ? <span className="text-xs text-muted-foreground">{youLabel}</span> : null}
      </span>
      <span className="shrink-0 text-sm font-semibold">{entry.value}</span>
    </Link>
  );
}
