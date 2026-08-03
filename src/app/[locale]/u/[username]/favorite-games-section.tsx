"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Link } from "@/i18n/navigation";

const MAX_FAVORITES = 4;

type FavoriteGame = {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  rating: number | null;
  notes: string | null;
};

export function FavoriteGamesSection({
  initialFavorites,
  canEdit,
}: {
  initialFavorites: FavoriteGame[];
  canEdit: boolean;
}) {
  const t = useTranslations("Profile");
  const tCommon = useTranslations("Common");
  const utils = trpc.useUtils();
  const { data: favorites } = trpc.user.getFavorites.useQuery(undefined, { enabled: canEdit });
  const { data: myLogs } = trpc.log.listForUser.useQuery(undefined, { enabled: canEdit });

  const [picking, setPicking] = useState(false);
  const [filter, setFilter] = useState("");

  const setFavorites = trpc.user.setFavorites.useMutation({
    onSuccess: () => {
      utils.user.getFavorites.invalidate();
      toast.success(t("favoritesUpdated"));
    },
    onError: () => toast.error(tCommon("genericError")),
  });

  const list = canEdit ? (favorites ?? initialFavorites) : initialFavorites;

  if (!canEdit && list.length === 0) return null;

  const favoriteIds = new Set(list.map((g) => g.id));
  const candidates = (myLogs ?? [])
    .filter((log) => log.rating != null && !favoriteIds.has(log.gameId))
    .filter((log) => log.game.title.toLowerCase().includes(filter.trim().toLowerCase()));

  function pick(gameId: string) {
    setFavorites.mutate({ gameIds: [...list.map((g) => g.id), gameId] });
    setPicking(false);
    setFilter("");
  }

  function remove(gameId: string) {
    setFavorites.mutate({ gameIds: list.filter((g) => g.id !== gameId).map((g) => g.id) });
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("favoritesTitle")}
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0 md:grid-cols-6 lg:grid-cols-8">
        {list.map((game) => (
          <div key={game.id} className="flex w-28 shrink-0 flex-col gap-2 sm:w-auto">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md border border-border bg-muted">
              {game.coverUrl ? (
                <Image
                  src={game.coverUrl}
                  alt={game.title}
                  fill
                  sizes="(max-width: 768px) 45vw, 160px"
                  className="object-cover"
                />
              ) : null}
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => remove(game.id)}
                  aria-label={t("favoritesRemove")}
                  className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-background/80 text-foreground hover:bg-background"
                >
                  ×
                </button>
              ) : null}
            </div>
            <div className="flex flex-col" title={game.notes ?? undefined}>
              <Link href={`/games/${game.slug}`} prefetch={false} className="truncate text-sm font-medium hover:underline">
                {game.title}
              </Link>
              {game.rating != null ? (
                <span className="text-xs text-muted-foreground">{game.rating.toFixed(1)}/10</span>
              ) : null}
              {game.notes ? (
                <span className="truncate text-xs text-muted-foreground">{game.notes}</span>
              ) : null}
            </div>
          </div>
        ))}

        {canEdit && list.length < MAX_FAVORITES ? (
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="flex aspect-[3/4] w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-accent hover:text-foreground sm:w-full"
          >
            {t("favoritesAdd")}
          </button>
        ) : null}
      </div>

      {picking ? (
        <div className="flex flex-col gap-2 rounded-md border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t("favoritesFilterPlaceholder")}
              className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="button"
              onClick={() => {
                setPicking(false);
                setFilter("");
              }}
              className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
            >
              {t("favoritesCancel")}
            </button>
          </div>

          {candidates.length > 0 ? (
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
              {candidates.map((log) => (
                <button
                  key={log.gameId}
                  type="button"
                  onClick={() => pick(log.gameId)}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <div className="relative h-10 w-8 shrink-0 overflow-hidden rounded border border-border bg-muted">
                    {log.game.coverUrl ? (
                      <Image
                        src={log.game.coverUrl}
                        alt={log.game.title}
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  {log.game.title}
                  {log.rating != null ? (
                    <span className="text-muted-foreground">{log.rating.toFixed(1)}/10</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">{t("favoritesNoCandidates")}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
