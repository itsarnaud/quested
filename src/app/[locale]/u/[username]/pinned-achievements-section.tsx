"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Link } from "@/i18n/navigation";

const MAX_PINNED = 4;

type PinnedAchievement = {
  id: string;
  displayName: string;
  iconUrl: string;
  gameSlug: string;
  gameTitle: string;
};

export function PinnedAchievementsSection({
  initialPinned,
  canEdit,
}: {
  initialPinned: PinnedAchievement[];
  canEdit: boolean;
}) {
  const t = useTranslations("Profile");
  const tCommon = useTranslations("Common");
  const utils = trpc.useUtils();
  const { data: pinned } = trpc.user.getPinnedAchievements.useQuery(undefined, { enabled: canEdit });
  const { data: unlocked } = trpc.user.getUnlockedAchievements.useQuery(undefined, { enabled: canEdit });

  const [picking, setPicking] = useState(false);
  const [filter, setFilter] = useState("");

  const setPinned = trpc.user.setPinnedAchievements.useMutation({
    onSuccess: () => {
      utils.user.getPinnedAchievements.invalidate();
      toast.success(t("pinnedUpdated"));
    },
    onError: () => toast.error(tCommon("genericError")),
  });

  const list = canEdit ? (pinned ?? initialPinned) : initialPinned;

  if (!canEdit && list.length === 0) return null;

  const pinnedIds = new Set(list.map((a) => a.id));
  const query = filter.trim().toLowerCase();
  const candidates = (unlocked ?? [])
    .filter((a) => !pinnedIds.has(a.id))
    .filter((a) => a.displayName.toLowerCase().includes(query) || a.gameTitle.toLowerCase().includes(query));

  function pick(achievementId: string) {
    setPinned.mutate({ achievementIds: [...list.map((a) => a.id), achievementId] });
    setPicking(false);
    setFilter("");
  }

  function remove(achievementId: string) {
    setPinned.mutate({ achievementIds: list.filter((a) => a.id !== achievementId).map((a) => a.id) });
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("pinnedTitle")}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-6 sm:overflow-visible sm:pb-0 md:grid-cols-8 lg:grid-cols-10">
        {list.map((achievement) => (
          <div key={achievement.id} className="flex w-16 shrink-0 flex-col gap-1.5 sm:w-auto">
            <div className="relative aspect-square w-full overflow-hidden rounded-md border border-border bg-muted">
              <Image
                src={achievement.iconUrl}
                alt={achievement.displayName}
                fill
                unoptimized
                className="object-cover"
              />
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => remove(achievement.id)}
                  disabled={setPinned.isPending}
                  aria-label={t("pinnedRemove")}
                  className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-background/80 text-[10px] leading-none text-foreground hover:bg-background disabled:opacity-50"
                >
                  ×
                </button>
              ) : null}
            </div>
            <div className="flex flex-col">
              <span className="truncate text-xs font-medium">{achievement.displayName}</span>
              <Link
                href={`/games/${achievement.gameSlug}`}
                prefetch={false}
                className="truncate text-[11px] text-muted-foreground hover:underline"
              >
                {achievement.gameTitle}
              </Link>
            </div>
          </div>
        ))}

        {canEdit && list.length < MAX_PINNED ? (
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="flex aspect-square w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-[10px] text-muted-foreground hover:border-accent hover:text-foreground sm:w-full"
          >
            {t("pinnedAdd")}
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
              placeholder={t("pinnedFilterPlaceholder")}
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
              {t("pinnedCancel")}
            </button>
          </div>

          {candidates.length > 0 ? (
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
              {candidates.slice(0, 50).map((achievement) => (
                <button
                  key={achievement.id}
                  type="button"
                  onClick={() => pick(achievement.id)}
                  disabled={setPinned.isPending}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                >
                  <div className="relative size-8 shrink-0 overflow-hidden rounded border border-border bg-muted">
                    <Image src={achievement.iconUrl} alt="" fill unoptimized className="object-cover" />
                  </div>
                  <span className="min-w-0 flex-1 truncate">{achievement.displayName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{achievement.gameTitle}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">{t("pinnedNoCandidates")}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
