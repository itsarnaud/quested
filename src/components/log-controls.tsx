"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const STATUSES = ["BACKLOG", "PLAYING", "COMPLETED", "DROPPED", "WISHLIST"] as const;

type Log = {
  status: (typeof STATUSES)[number];
  rating: number | null;
  notes: string | null;
} | null | undefined;

export function LogControls({ gameId, isUnreleased = false }: { gameId: string; isUnreleased?: boolean }) {
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
            onClick={() =>
              upsert.mutate({
                gameId,
                status,
                rating: log?.rating ?? undefined,
                notes: log?.notes ?? undefined,
              })
            }
            className={cn(
              "h-9 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-muted",
              log?.status === status && "border-accent bg-accent text-accent-foreground hover:opacity-90",
            )}
          >
            {t(status)}
          </button>
        ))}
      </div>

      {log?.status && !isUnreleased ? (
        <RatingAndNotes
          key={`${log.rating}-${log.notes}`}
          gameId={gameId}
          log={log}
          onSave={(patch) =>
            upsert.mutate({
              gameId,
              status: log.status,
              rating: log.rating ?? undefined,
              notes: log.notes ?? undefined,
              ...patch,
            })
          }
          isPending={upsert.isPending}
        />
      ) : log?.status && isUnreleased ? (
        <p className="text-sm text-muted-foreground">{tRating("notYetReleased")}</p>
      ) : null}
    </div>
  );
}

function RatingAndNotes({
  log,
  onSave,
  isPending,
}: {
  gameId: string;
  log: Log;
  onSave: (patch: { rating?: number; notes?: string }) => void;
  isPending: boolean;
}) {
  const tRating = useTranslations("LogControls");
  const [rating, setRating] = useState(log?.rating ?? 5);
  const [hasRating, setHasRating] = useState(log?.rating != null);
  const [notes, setNotes] = useState(log?.notes ?? "");
  const notesDirty = notes !== (log?.notes ?? "");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{tRating("rating")}</span>
        <input
          type="range"
          min={0}
          max={10}
          step={0.1}
          value={rating}
          onChange={(e) => {
            setRating(Number(e.target.value));
            setHasRating(true);
          }}
          onMouseUp={() => onSave({ rating })}
          onTouchEnd={() => onSave({ rating })}
          onKeyUp={() => onSave({ rating })}
          className="h-2 w-40 cursor-pointer accent-accent"
        />
        <span className="w-14 text-sm font-medium">{hasRating ? `${rating.toFixed(1)}/10` : "—"}</span>
        {hasRating ? (
          <button
            type="button"
            onClick={() => {
              setHasRating(false);
              onSave({ rating: undefined });
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {tRating("clearRating")}
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">{tRating("notes")}</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={tRating("notesPlaceholder")}
          maxLength={2000}
          rows={4}
          className="w-full resize-none rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        {notesDirty ? (
          <Button
            type="button"
            variant="secondary"
            className="w-fit"
            disabled={isPending}
            onClick={() => onSave({ notes })}
          >
            {tRating("save")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
