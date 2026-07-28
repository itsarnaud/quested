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
  const [ratingInput, setRatingInput] = useState(log?.rating != null ? String(log.rating) : "");
  const [notes, setNotes] = useState(log?.notes ?? "");
  const notesDirty = notes !== (log?.notes ?? "");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{tRating("rating")}</span>
        <input
          type="number"
          step={0.1}
          min={0}
          max={10}
          value={ratingInput}
          onChange={(e) => setRatingInput(e.target.value)}
          onBlur={() => {
            const value = ratingInput.trim();
            const rating = value ? Math.min(10, Math.max(0, Number(value))) : undefined;
            onSave({ rating });
          }}
          placeholder="—"
          className="h-9 w-20 rounded-md border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <span className="text-sm text-muted-foreground">/10</span>
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
