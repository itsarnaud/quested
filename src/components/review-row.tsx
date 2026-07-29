import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { HeartIcon } from "@/components/icons/heart-icon";
import { LikeButton } from "@/components/like-button";

export type ReviewRowData = {
  id: string;
  gameSlug: string;
  gameTitle: string;
  coverUrl: string | null;
  rating: number | null;
  notes: string | null;
};

export function ReviewRow({
  log,
  statusLabel,
  canLike,
  isLiked,
  likeCount,
}: {
  log: ReviewRowData;
  statusLabel: string;
  canLike: boolean;
  isLiked: boolean;
  likeCount: number;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/games/${log.gameSlug}`} prefetch={false} className="flex gap-3 hover:opacity-90">
          <div className="relative h-24 w-[72px] shrink-0 overflow-hidden rounded border border-border bg-muted">
            {log.coverUrl ? (
              <Image src={log.coverUrl} alt={log.gameTitle} fill sizes="72px" className="object-cover" />
            ) : null}
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-medium">{log.gameTitle}</span>
            <span className="text-sm text-muted-foreground">
              {statusLabel}
              {log.rating != null ? ` · ${log.rating.toFixed(1)}/10` : ""}
            </span>
          </div>
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

      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{log.notes}</p>
    </div>
  );
}
