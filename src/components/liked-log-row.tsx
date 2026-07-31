import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { HeartIcon } from "@/components/icons/heart-icon";
import { LikeButton } from "@/components/like-button";
import { UserBadges } from "@/components/user-badges";
import type { Badge } from "@/generated/prisma/client";

export type LikedLogRowData = {
  id: string;
  gameSlug: string;
  gameTitle: string;
  gameReleaseYear: number | null;
  coverUrl: string | null;
  rating: number | null;
  notes: string | null;
  userUsername: string | null;
  userName: string | null;
  userBadges: Badge[];
};

export function LikedLogRow({
  log,
  statusLabel,
  canLike,
  isLiked,
  likeCount,
}: {
  log: LikedLogRowData;
  statusLabel: string;
  canLike: boolean;
  isLiked: boolean;
  likeCount: number;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/u/${log.userUsername}`} className="text-sm hover:underline">
          <span className="font-medium">{log.userName ?? log.userUsername}</span>{" "}
          <UserBadges badges={log.userBadges} />
          <span className="text-muted-foreground">
            {" "}
            @{log.userUsername} · {statusLabel}
            {log.rating != null ? ` · ${log.rating.toFixed(1)}/10` : ""}
          </span>
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

      <Link href={`/games/${log.gameSlug}`} prefetch={false} className="flex min-w-0 gap-3 hover:opacity-90">
        <div className="relative h-24 w-[72px] shrink-0 overflow-hidden rounded border border-border bg-muted">
          {log.coverUrl ? (
            <Image src={log.coverUrl} alt={log.gameTitle} fill sizes="72px" className="object-cover" />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col justify-center">
          <span className="truncate font-medium">{log.gameTitle}</span>
          {log.gameReleaseYear ? (
            <span className="text-sm text-muted-foreground">{log.gameReleaseYear}</span>
          ) : null}
        </div>
      </Link>

      {log.notes ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{log.notes}</p> : null}
    </div>
  );
}
