"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { PsnIcon } from "@/components/icons/psn-icon";

const LIBRARY_PAGE_SIZE = 40;
const ACHIEVEMENTS_PAGE_SIZE = 5;

type SyncState =
  | { status: "idle" }
  | { status: "syncing"; phase: "library" | "achievements"; done: number; total: number };

// Leaving mid-sync aborts the in-flight request and stops the loop for
// good — the native "are you sure" prompt is the only real way to warn
// against that (browsers ignore any custom message here).
const useBeforeUnloadWarning = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);
};

export function PsnSyncButton({ className = "rounded-full" }: { className?: string }) {
  const t = useTranslations("Account");
  const [state, setState] = useState<SyncState>({ status: "idle" });

  useBeforeUnloadWarning(state.status === "syncing");

  const utils = trpc.useUtils();
  const syncPage = trpc.psn.syncPage.useMutation();
  const syncAchievementsPage = trpc.psn.syncAchievementsPage.useMutation();

  async function runSync() {
    setState({ status: "syncing", phase: "library", done: 0, total: 0 });

    // Same reasoning as the Steam button: never trust a cached "private"
    // result here, the user may have just flipped their PSN privacy setting.
    const size = await utils.psn.getLibrarySize.fetch(undefined, { staleTime: 0 }).catch(() => null);
    if (!size) {
      setState({ status: "idle" });
      toast.error(t("genericError"));
      return;
    }
    if (size.isPrivate) {
      setState({ status: "idle" });
      toast.error(t("psnProfilePrivate"));
      return;
    }

    try {
      let offset = 0;
      setState({ status: "syncing", phase: "library", done: 0, total: size.total });
      while (offset < size.total) {
        await syncPage.mutateAsync({ offset, limit: LIBRARY_PAGE_SIZE });
        offset += LIBRARY_PAGE_SIZE;
        setState({ status: "syncing", phase: "library", done: Math.min(offset, size.total), total: size.total });
      }

      const gameCount = await utils.psn.getTrackedGameCount.fetch();
      let achOffset = 0;
      let achievementsUnlocked = 0;
      setState({ status: "syncing", phase: "achievements", done: 0, total: gameCount });
      while (achOffset < gameCount) {
        const result = await syncAchievementsPage.mutateAsync({ offset: achOffset, limit: ACHIEVEMENTS_PAGE_SIZE });
        achievementsUnlocked += result.achievementsUnlocked;
        achOffset += ACHIEVEMENTS_PAGE_SIZE;
        setState({
          status: "syncing",
          phase: "achievements",
          done: Math.min(achOffset, gameCount),
          total: gameCount,
        });
      }

      setState({ status: "idle" });
      toast.success(t("syncPsnComplete", { games: size.total, achievements: achievementsUnlocked }));
    } catch {
      setState({ status: "idle" });
      toast.error(t("genericError"));
    }
  }

  if (state.status === "syncing") {
    const label = state.phase === "library" ? t("syncingLibrary") : t("syncingAchievements");
    const percent = state.total > 0 ? Math.round((state.done / state.total) * 100) : 0;

    return (
      <>
        <Button type="button" variant="secondary" className={className} isLoading>
          {label} · {state.done}/{state.total}
        </Button>

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-xs flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 text-center">
            <PsnIcon width={28} height={28} />
            <p className="text-sm font-medium">
              {label} · {state.done}/{state.total}
            </p>
            <p className="text-xs text-muted-foreground">{t("steamSyncWarning")}</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-[width]"
                style={{ width: `${Math.max(4, percent)}%` }}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <Button type="button" variant="secondary" className={className} onClick={runSync}>
      {t("syncPsn")}
    </Button>
  );
}
