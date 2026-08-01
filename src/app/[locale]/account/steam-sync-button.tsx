"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

const LIBRARY_PAGE_SIZE = 40;
const ACHIEVEMENTS_PAGE_SIZE = 5;

type SyncState =
  | { status: "idle" }
  | { status: "private" }
  | { status: "syncing"; phase: "library" | "achievements"; done: number; total: number }
  | { status: "complete"; games: number; achievements: number }
  | { status: "error" };

export function SteamSyncButton() {
  const t = useTranslations("Account");
  const [state, setState] = useState<SyncState>({ status: "idle" });

  const utils = trpc.useUtils();
  const syncPage = trpc.steam.syncPage.useMutation();
  const syncAchievementsPage = trpc.steam.syncAchievementsPage.useMutation();

  async function runSync() {
    setState({ status: "syncing", phase: "library", done: 0, total: 0 });

    const size = await utils.steam.getLibrarySize.fetch().catch(() => null);
    if (!size) {
      setState({ status: "error" });
      return;
    }
    if (size.isPrivate) {
      setState({ status: "private" });
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

      const gameCount = await utils.steam.getTrackedGameCount.fetch();
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

      setState({ status: "complete", games: size.total, achievements: achievementsUnlocked });
    } catch {
      setState({ status: "error" });
    }
  }

  if (state.status === "syncing") {
    const label = state.phase === "library" ? t("syncingLibrary") : t("syncingAchievements");
    return (
      <Button type="button" variant="secondary" className="rounded-full" disabled>
        {label} · {state.done}/{state.total}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="secondary" className="rounded-full" onClick={runSync}>
        {t("syncSteam")}
      </Button>
      {state.status === "private" ? (
        <p className="text-xs text-red-400">{t("steamProfilePrivate")}</p>
      ) : state.status === "complete" ? (
        <p className="text-xs text-muted-foreground">
          {t("syncSteamComplete", { games: state.games, achievements: state.achievements })}
        </p>
      ) : state.status === "error" ? (
        <p className="text-xs text-red-400">{t("genericError")}</p>
      ) : null}
    </div>
  );
}
