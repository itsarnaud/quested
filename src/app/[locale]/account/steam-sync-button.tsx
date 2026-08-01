"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 40;

type SyncState =
  | { status: "idle" }
  | { status: "private" }
  | { status: "syncing"; done: number; total: number }
  | { status: "complete"; total: number }
  | { status: "error" };

export function SteamSyncButton() {
  const t = useTranslations("Account");
  const [state, setState] = useState<SyncState>({ status: "idle" });

  const utils = trpc.useUtils();
  const syncPage = trpc.steam.syncPage.useMutation();

  async function runSync() {
    setState({ status: "syncing", done: 0, total: 0 });

    const size = await utils.steam.getLibrarySize.fetch().catch(() => null);
    if (!size) {
      setState({ status: "error" });
      return;
    }
    if (size.isPrivate) {
      setState({ status: "private" });
      return;
    }

    const total = size.total;
    let offset = 0;
    setState({ status: "syncing", done: 0, total });

    try {
      while (offset < total) {
        await syncPage.mutateAsync({ offset, limit: PAGE_SIZE });
        offset += PAGE_SIZE;
        setState({ status: "syncing", done: Math.min(offset, total), total });
      }
      setState({ status: "complete", total });
    } catch {
      setState({ status: "error" });
    }
  }

  if (state.status === "syncing") {
    return (
      <div className="flex flex-col gap-1">
        <Button type="button" variant="secondary" className="rounded-full" disabled>
          {t("syncing", { done: state.done, total: state.total })}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="secondary" className="rounded-full" onClick={runSync}>
        {t("syncLibrary")}
      </Button>
      {state.status === "private" ? (
        <p className="text-xs text-red-400">{t("steamProfilePrivate")}</p>
      ) : state.status === "complete" ? (
        <p className="text-xs text-muted-foreground">{t("syncComplete", { total: state.total })}</p>
      ) : state.status === "error" ? (
        <p className="text-xs text-red-400">{t("genericError")}</p>
      ) : null}
    </div>
  );
}

const ACHIEVEMENTS_PAGE_SIZE = 5;

type AchievementsSyncState =
  | { status: "idle" }
  | { status: "syncing"; done: number; total: number }
  | { status: "complete"; unlocked: number }
  | { status: "error" };

export function SteamAchievementsSyncButton() {
  const t = useTranslations("Account");
  const [state, setState] = useState<AchievementsSyncState>({ status: "idle" });

  const utils = trpc.useUtils();
  const syncAchievementsPage = trpc.steam.syncAchievementsPage.useMutation();

  async function runSync() {
    setState({ status: "syncing", done: 0, total: 0 });

    const total = await utils.steam.getTrackedGameCount.fetch().catch(() => null);
    if (total === null) {
      setState({ status: "error" });
      return;
    }

    let offset = 0;
    let unlocked = 0;
    setState({ status: "syncing", done: 0, total });

    try {
      while (offset < total) {
        const result = await syncAchievementsPage.mutateAsync({ offset, limit: ACHIEVEMENTS_PAGE_SIZE });
        unlocked += result.achievementsUnlocked;
        offset += ACHIEVEMENTS_PAGE_SIZE;
        setState({ status: "syncing", done: Math.min(offset, total), total });
      }
      setState({ status: "complete", unlocked });
    } catch {
      setState({ status: "error" });
    }
  }

  if (state.status === "syncing") {
    return (
      <Button type="button" variant="secondary" className="rounded-full" disabled>
        {t("syncing", { done: state.done, total: state.total })}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="secondary" className="rounded-full" onClick={runSync}>
        {t("syncAchievements")}
      </Button>
      {state.status === "complete" ? (
        <p className="text-xs text-muted-foreground">{t("syncAchievementsComplete", { unlocked: state.unlocked })}</p>
      ) : state.status === "error" ? (
        <p className="text-xs text-red-400">{t("genericError")}</p>
      ) : null}
    </div>
  );
}
