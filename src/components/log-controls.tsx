"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { formatPlaytime } from "@/lib/format-playtime";
import { Button } from "@/components/ui/button";

const STATUSES = ["BACKLOG", "PLAYING", "COMPLETED", "DROPPED", "WISHLIST"] as const;

// How long the "Annuler" action stays valid before the log is actually
// deleted — the row is only removed once this window elapses untouched.
const REMOVE_UNDO_MS = 5000;

type Log = {
  status: (typeof STATUSES)[number];
  rating: number | null;
  notes: string | null;
  minutesPlayed: number | null;
} | null | undefined;

export function LogControls({ gameId, isUnreleased = false }: { gameId: string; isUnreleased?: boolean }) {
  const t = useTranslations("GameStatus");
  const tRating = useTranslations("LogControls");
  const tCommon = useTranslations("Common");
  const utils = trpc.useUtils();
  const { data: log } = trpc.log.getForGame.useQuery({ gameId });
  const upsert = trpc.log.upsert.useMutation({
    onSuccess: () => utils.log.getForGame.invalidate({ gameId }),
    onError: () => toast.error(tCommon("genericError")),
  });
  const del = trpc.log.delete.useMutation({
    onSuccess: () => utils.log.getForGame.invalidate({ gameId }),
    onError: () => toast.error(tCommon("genericError")),
  });

  const [pendingRemoval, setPendingRemoval] = useState(false);
  const removeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (removeTimeoutRef.current) clearTimeout(removeTimeoutRef.current);
    };
  }, []);

  const effectiveLog = pendingRemoval ? null : log;

  const handleStatusClick = (status: (typeof STATUSES)[number]) => {
    if (log?.status === status) {
      setPendingRemoval(true);
      toast.success(tRating("logRemoved"), {
        duration: REMOVE_UNDO_MS,
        action: {
          label: tCommon("undo"),
          onClick: () => {
            if (removeTimeoutRef.current) clearTimeout(removeTimeoutRef.current);
            setPendingRemoval(false);
          },
        },
      });
      removeTimeoutRef.current = setTimeout(() => {
        del.mutate({ gameId });
      }, REMOVE_UNDO_MS);
      return;
    }

    upsert.mutate({
      gameId,
      status,
      rating: log?.rating ?? undefined,
      notes: log?.notes ?? undefined,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => handleStatusClick(status)}
            className={cn(
              "h-9 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-muted",
              effectiveLog?.status === status && "border-accent bg-accent text-accent-foreground hover:opacity-90",
            )}
          >
            {t(status)}
          </button>
        ))}
      </div>

      {effectiveLog?.minutesPlayed != null ? (
        <p className="text-sm text-muted-foreground">
          {tRating("playtime", { time: formatPlaytime(effectiveLog.minutesPlayed) })}
        </p>
      ) : null}

      {effectiveLog?.status && !isUnreleased ? (
        <RatingAndNotes
          key={`${effectiveLog.rating}-${effectiveLog.notes}`}
          gameId={gameId}
          log={effectiveLog}
          onSave={(patch, notify) =>
            upsert.mutate(
              {
                gameId,
                status: effectiveLog.status,
                rating: effectiveLog.rating ?? undefined,
                notes: effectiveLog.notes ?? undefined,
                ...patch,
              },
              notify ? { onSuccess: () => toast.success(tRating("savedToast")) } : undefined,
            )
          }
          isPending={upsert.isPending}
        />
      ) : effectiveLog?.status && isUnreleased ? (
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
  onSave: (patch: { rating?: number; notes?: string }, notify?: boolean) => void;
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
          className="h-2 w-40 cursor-pointer accent-accent [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
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
          className="w-full resize-none rounded-md border border-border bg-card px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent"
        />
        {notesDirty ? (
          <Button
            type="button"
            variant="secondary"
            className="w-fit"
            disabled={isPending}
            onClick={() => onSave({ notes }, true)}
          >
            {tRating("save")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
