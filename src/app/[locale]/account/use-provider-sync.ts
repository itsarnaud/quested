"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";

const LIBRARY_PAGE_SIZE = 40;
// Server-side sync of a page runs its games in parallel (Promise.allSettled),
// so a bigger page is still fast — and means fewer round trips against the
// shared per-provider rate limit bucket (syncPage + syncAchievementsPage
// together).
const ACHIEVEMENTS_PAGE_SIZE = 20;

export type SyncPhase = "library" | "achievements";
// pausedUntil: only ever set by useXboxSync, when OpenXBL's shared 150/hour
// budget runs out mid-sync — Steam/PSN never set it, their callers can
// safely ignore the field.
export type SyncProgress = { phase: SyncPhase; done: number; total: number; pausedUntil?: number };

// Leaving mid-sync aborts the in-flight request and stops the loop for
// good — the native "are you sure" prompt is the only real way to warn
// against that (browsers ignore any custom message here).
export const useBeforeUnloadWarning = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);
};

// Shared library+achievements sync loop, used by SteamSyncButton,
// PsnSyncButton and SyncAllButton — keeping it in one place means a rate
// limit, page size, or error-handling fix only has to happen once.
export function useSteamSync() {
  const t = useTranslations("Account");
  const utils = trpc.useUtils();
  const syncPage = trpc.steam.syncPage.useMutation();
  const syncAchievementsPage = trpc.steam.syncAchievementsPage.useMutation();

  return async function sync(onProgress: (progress: SyncProgress) => void) {
    // Bypass the query cache's default staleTime: this checks live Steam-side
    // state (profile visibility, library size) that can change between two
    // clicks of this button — a cached "private" result must never block a
    // retry right after the user actually made their profile public.
    const size = await utils.steam.getLibrarySize.fetch(undefined, { staleTime: 0 }).catch(() => null);
    if (!size) {
      toast.error(t("genericError"));
      return;
    }
    if (size.isPrivate) {
      toast.error(t("steamProfilePrivate"), {
        action: {
          label: t("steamPrivacySettingsLink"),
          onClick: () => window.open("https://steamcommunity.com/my/edit/settings", "_blank", "noopener,noreferrer"),
        },
      });
      return;
    }

    let offset = 0;
    onProgress({ phase: "library", done: 0, total: size.total });
    while (offset < size.total) {
      await syncPage.mutateAsync({ offset, limit: LIBRARY_PAGE_SIZE });
      offset += LIBRARY_PAGE_SIZE;
      onProgress({ phase: "library", done: Math.min(offset, size.total), total: size.total });
    }

    const gameCount = await utils.steam.getTrackedGameCount.fetch();
    let achOffset = 0;
    let achievementsUnlocked = 0;
    onProgress({ phase: "achievements", done: 0, total: gameCount });
    while (achOffset < gameCount) {
      const result = await syncAchievementsPage.mutateAsync({ offset: achOffset, limit: ACHIEVEMENTS_PAGE_SIZE });
      achievementsUnlocked += result.achievementsUnlocked;
      achOffset += ACHIEVEMENTS_PAGE_SIZE;
      onProgress({ phase: "achievements", done: Math.min(achOffset, gameCount), total: gameCount });
    }

    toast.success(t("syncSteamComplete", { games: size.total, achievements: achievementsUnlocked }));
  };
}

export function usePsnSync() {
  const t = useTranslations("Account");
  const utils = trpc.useUtils();
  const syncPage = trpc.psn.syncPage.useMutation();
  const syncAchievementsPage = trpc.psn.syncAchievementsPage.useMutation();

  return async function sync(onProgress: (progress: SyncProgress) => void) {
    // Same reasoning as Steam's: never trust a cached "private" result here,
    // the user may have just flipped their PSN privacy setting.
    const size = await utils.psn.getLibrarySize.fetch(undefined, { staleTime: 0 }).catch(() => null);
    if (!size) {
      toast.error(t("genericError"));
      return;
    }
    if (size.isPrivate) {
      toast.error(t("psnProfilePrivate"));
      return;
    }

    let offset = 0;
    onProgress({ phase: "library", done: 0, total: size.total });
    while (offset < size.total) {
      await syncPage.mutateAsync({ offset, limit: LIBRARY_PAGE_SIZE });
      offset += LIBRARY_PAGE_SIZE;
      onProgress({ phase: "library", done: Math.min(offset, size.total), total: size.total });
    }

    const gameCount = await utils.psn.getTrackedGameCount.fetch();
    let achOffset = 0;
    let achievementsUnlocked = 0;
    onProgress({ phase: "achievements", done: 0, total: gameCount });
    while (achOffset < gameCount) {
      const result = await syncAchievementsPage.mutateAsync({ offset: achOffset, limit: ACHIEVEMENTS_PAGE_SIZE });
      achievementsUnlocked += result.achievementsUnlocked;
      achOffset += ACHIEVEMENTS_PAGE_SIZE;
      onProgress({ phase: "achievements", done: Math.min(achOffset, gameCount), total: gameCount });
    }

    toast.success(t("syncPsnComplete", { games: size.total, achievements: achievementsUnlocked }));
  };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useXboxSync() {
  const t = useTranslations("Account");
  const utils = trpc.useUtils();
  const syncLibrary = trpc.xbox.syncLibrary.useMutation();
  const syncAchievementsPage = trpc.xbox.syncAchievementsPage.useMutation();

  return async function sync(onProgress: (progress: SyncProgress) => void) {
    // OpenXBL's 150/hour budget is shared by every user of the app at
    // once (see xboxGlobalRatelimit) — a page can come back with
    // pausedUntil set instead of failing outright, meaning "wait, then
    // pick up right where you left off" rather than "something broke".
    onProgress({ phase: "library", done: 0, total: 1 });
    let library = await syncLibrary.mutateAsync();
    while (library.pausedUntil) {
      onProgress({ phase: "library", done: 0, total: 1, pausedUntil: library.pausedUntil });
      await wait(Math.max(0, library.pausedUntil - Date.now()));
      library = await syncLibrary.mutateAsync();
    }
    onProgress({ phase: "library", done: 1, total: 1 });

    const gameCount = await utils.xbox.getTrackedGameCount.fetch();
    let achOffset = 0;
    let achievementsUnlocked = 0;
    onProgress({ phase: "achievements", done: 0, total: gameCount });
    while (achOffset < gameCount) {
      const result = await syncAchievementsPage.mutateAsync({ offset: achOffset, limit: ACHIEVEMENTS_PAGE_SIZE });
      achievementsUnlocked += result.achievementsUnlocked;
      achOffset += result.gamesProcessed;

      if (result.pausedUntil) {
        onProgress({ phase: "achievements", done: achOffset, total: gameCount, pausedUntil: result.pausedUntil });
        await wait(Math.max(0, result.pausedUntil - Date.now()));
      } else {
        onProgress({ phase: "achievements", done: Math.min(achOffset, gameCount), total: gameCount });
      }
    }

    toast.success(t("syncXboxComplete", { games: library.total, achievements: achievementsUnlocked }));
  };
}
