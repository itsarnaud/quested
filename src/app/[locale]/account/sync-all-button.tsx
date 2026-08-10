"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

const LIBRARY_PAGE_SIZE = 40;
const ACHIEVEMENTS_PAGE_SIZE = 20;

type Provider = "steam" | "psn";
type SyncState =
  | { status: "idle" }
  | { status: "syncing"; provider: Provider; phase: "library" | "achievements"; done: number; total: number };

// Same reasoning as SteamSyncButton/PsnSyncButton: leaving mid-sync aborts
// the in-flight request for good, so the native "are you sure" prompt is
// the only real way to warn against it.
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

// Replaces showing one sync button per linked provider — side by side they
// got too wide and wrapped onto a new line (Steam + PSN both linked). One
// generic button instead, which syncs whichever provider(s) are linked, one
// after another, without naming which one is currently running until it's
// actually mid-sync.
//
// Also auto-triggers itself right after a provider gets linked, anywhere
// this button is rendered (onboarding, account settings, profile) — no
// per-page wiring needed, this detects it on its own:
// - Steam always links via a full-page OAuth redirect, landing back with
//   ?steamLinked=1 in the URL (see /api/auth/steam/callback) — that
//   survives the reload, unlike React state.
// - PSN links inline (PsnLinkForm just calls router.refresh(), no
//   navigation) — so instead this watches its own hasPsnLinked prop flip
//   from false to true across renders of the same mounted instance. That
//   only works if this button was already mounted *before* the link
//   happened — in onboarding, it doesn't exist in the tree at all until at
//   least one provider is linked, so there's no "before" to compare
//   against. `autoStart` is the escape hatch for that case: onboarding
//   passes it unconditionally, since every provider linked there is by
//   definition brand new — no ambiguity to resolve.
export function SyncAllButton({
  hasSteamLinked,
  hasPsnLinked,
  autoStart = false,
  variant = "secondary",
  className = "rounded-full",
}: {
  hasSteamLinked: boolean;
  hasPsnLinked: boolean;
  autoStart?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const t = useTranslations("Account");
  const [state, setState] = useState<SyncState>({ status: "idle" });

  useBeforeUnloadWarning(state.status === "syncing");

  const utils = trpc.useUtils();
  const steamSyncPage = trpc.steam.syncPage.useMutation();
  const steamSyncAchievementsPage = trpc.steam.syncAchievementsPage.useMutation();
  const psnSyncPage = trpc.psn.syncPage.useMutation();
  const psnSyncAchievementsPage = trpc.psn.syncAchievementsPage.useMutation();

  async function syncSteam() {
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
    setState({ status: "syncing", provider: "steam", phase: "library", done: 0, total: size.total });
    while (offset < size.total) {
      await steamSyncPage.mutateAsync({ offset, limit: LIBRARY_PAGE_SIZE });
      offset += LIBRARY_PAGE_SIZE;
      setState({
        status: "syncing",
        provider: "steam",
        phase: "library",
        done: Math.min(offset, size.total),
        total: size.total,
      });
    }

    const gameCount = await utils.steam.getTrackedGameCount.fetch();
    let achOffset = 0;
    let achievementsUnlocked = 0;
    setState({ status: "syncing", provider: "steam", phase: "achievements", done: 0, total: gameCount });
    while (achOffset < gameCount) {
      const result = await steamSyncAchievementsPage.mutateAsync({ offset: achOffset, limit: ACHIEVEMENTS_PAGE_SIZE });
      achievementsUnlocked += result.achievementsUnlocked;
      achOffset += ACHIEVEMENTS_PAGE_SIZE;
      setState({
        status: "syncing",
        provider: "steam",
        phase: "achievements",
        done: Math.min(achOffset, gameCount),
        total: gameCount,
      });
    }

    toast.success(t("syncSteamComplete", { games: size.total, achievements: achievementsUnlocked }));
  }

  async function syncPsn() {
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
    setState({ status: "syncing", provider: "psn", phase: "library", done: 0, total: size.total });
    while (offset < size.total) {
      await psnSyncPage.mutateAsync({ offset, limit: LIBRARY_PAGE_SIZE });
      offset += LIBRARY_PAGE_SIZE;
      setState({
        status: "syncing",
        provider: "psn",
        phase: "library",
        done: Math.min(offset, size.total),
        total: size.total,
      });
    }

    const gameCount = await utils.psn.getTrackedGameCount.fetch();
    let achOffset = 0;
    let achievementsUnlocked = 0;
    setState({ status: "syncing", provider: "psn", phase: "achievements", done: 0, total: gameCount });
    while (achOffset < gameCount) {
      const result = await psnSyncAchievementsPage.mutateAsync({ offset: achOffset, limit: ACHIEVEMENTS_PAGE_SIZE });
      achievementsUnlocked += result.achievementsUnlocked;
      achOffset += ACHIEVEMENTS_PAGE_SIZE;
      setState({
        status: "syncing",
        provider: "psn",
        phase: "achievements",
        done: Math.min(achOffset, gameCount),
        total: gameCount,
      });
    }

    toast.success(t("syncPsnComplete", { games: size.total, achievements: achievementsUnlocked }));
  }

  async function runSync(sync: () => Promise<void>) {
    try {
      await sync();
    } catch {
      toast.error(t("genericError"));
    } finally {
      setState({ status: "idle" });
    }
  }

  async function runAll() {
    await runSync(async () => {
      if (hasSteamLinked) await syncSteam();
      if (hasPsnLinked) await syncPsn();
    });
  }

  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStart && !autoStarted.current) {
      autoStarted.current = true;
      runAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (autoStart) return;
    const steamJustLinked = new URLSearchParams(window.location.search).get("steamLinked") === "1";
    if (steamJustLinked) {
      const url = new URL(window.location.href);
      url.searchParams.delete("steamLinked");
      window.history.replaceState({}, "", url);
    }
    if (steamJustLinked && hasSteamLinked && !autoStarted.current) {
      autoStarted.current = true;
      runSync(syncSteam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevHasPsnLinked = useRef(hasPsnLinked);
  useEffect(() => {
    const psnJustLinked = !autoStart && !prevHasPsnLinked.current && hasPsnLinked;
    prevHasPsnLinked.current = hasPsnLinked;
    if (psnJustLinked) runSync(syncPsn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPsnLinked]);

  if (state.status === "syncing") {
    const providerLabel = state.provider === "steam" ? "Steam" : "PlayStation Network";
    const phaseLabel = state.phase === "library" ? t("syncingLibrary") : t("syncingAchievements");
    const percent = state.total > 0 ? Math.round((state.done / state.total) * 100) : 0;

    return (
      <>
        <Button type="button" variant={variant} className={className} isLoading>
          {providerLabel} · {phaseLabel} · {state.done}/{state.total}
        </Button>

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-xs flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm font-medium">
              {providerLabel} · {phaseLabel} · {state.done}/{state.total}
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
    <Button type="button" variant={variant} className={className} onClick={runAll}>
      {t("syncAll")}
    </Button>
  );
}
