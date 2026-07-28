"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const STATUSES = ["BACKLOG", "PLAYING", "COMPLETED", "DROPPED", "WISHLIST"] as const;

export function LogControls({ gameId }: { gameId: string }) {
  const t = useTranslations("GameStatus");
  const tRating = useTranslations("LogControls");
  const utils = trpc.useUtils();
  const { data: log } = trpc.log.getForGame.useQuery({ gameId });
  const upsert = trpc.log.upsert.useMutation({
    onSuccess: () => utils.log.getForGame.invalidate({ gameId }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => upsert.mutate({ gameId, status, rating: log?.rating ?? undefined })}
            className={cn(
              "h-9 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-muted",
              log?.status === status && "border-accent bg-accent text-accent-foreground hover:opacity-90",
            )}
          >
            {t(status)}
          </button>
        ))}
      </div>

      {log?.status ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{tRating("rating")}</span>
          <select
            value={log?.rating ?? ""}
            onChange={(e) =>
              upsert.mutate({
                gameId,
                status: log?.status ?? "BACKLOG",
                rating: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="h-9 rounded-md border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">—</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}/10
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
