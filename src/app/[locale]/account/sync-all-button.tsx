"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useBeforeUnloadWarning,
  useSteamSync,
  usePsnSync,
  useXboxSync,
  type SyncProgress,
} from "@/app/[locale]/account/use-provider-sync";

type Provider = "steam" | "psn" | "xbox";
type SyncState = { status: "idle" } | ({ status: "syncing"; provider: Provider } & SyncProgress);

const PROVIDER_LABELS: Record<Provider, string> = {
  steam: "Steam",
  psn: "PlayStation Network",
  xbox: "Xbox",
};

// One generic button syncs whichever provider(s) are linked, one after
// another — avoids the width/wrapping issues of showing a button per
// provider when several are linked, and doesn't name which provider is
// running until it's actually mid-sync.
//
// Auto-triggers itself right after a provider gets linked, wherever it's
// rendered, by detecting the link rather than needing per-page wiring:
// - Steam links via a full-page OAuth redirect, landing back with
//   ?steamLinked=1 (see /api/auth/steam/callback) — that survives the
//   reload, unlike React state.
// - PSN and Xbox link inline (no navigation), so this watches their own
//   hasPsnLinked/hasXboxLinked props flip from false to true. That only
//   works if the button was already mounted before the link happened — in
//   onboarding it isn't, so `autoStart` is the escape hatch: onboarding
//   passes it unconditionally since every provider linked there is brand
//   new.
export function SyncAllButton({
  hasSteamLinked,
  hasPsnLinked,
  hasXboxLinked,
  autoStart = false,
  variant = "secondary",
  className,
}: {
  hasSteamLinked: boolean;
  hasPsnLinked: boolean;
  hasXboxLinked: boolean;
  autoStart?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const t = useTranslations("Account");
  const tCommon = useTranslations("Common");
  const [state, setState] = useState<SyncState>({ status: "idle" });

  // Not active during an Xbox pause — see the same reasoning on
  // XboxSyncButton (no in-flight request to interrupt while waiting for
  // the shared Xbox budget to free up).
  useBeforeUnloadWarning(state.status === "syncing" && !state.pausedUntil);

  // Same reasoning as XboxSyncButton: a pause can last close to an hour, so
  // the overlay must be dismissible or the rest of the app is unusable
  // while it waits. Resets whenever a new pause actually starts.
  const pausedUntil = state.status === "syncing" ? state.pausedUntil : undefined;
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  // "Adjusting state during render" (React's own pattern for this, not an
  // effect) — resets in the same render a new pause appears in, not one
  // render later.
  const [prevPausedUntil, setPrevPausedUntil] = useState(pausedUntil);
  if (pausedUntil !== prevPausedUntil) {
    setPrevPausedUntil(pausedUntil);
    if (pausedUntil) setOverlayDismissed(false);
  }

  const syncSteam = useSteamSync();
  const syncPsn = usePsnSync();
  const syncXbox = useXboxSync();

  async function runSync(provider: Provider, sync: () => Promise<void>) {
    setState({ status: "syncing", provider, phase: "library", done: 0, total: 0 });
    try {
      await sync();
    } catch {
      toast.error(t("genericError"));
    } finally {
      setState({ status: "idle" });
    }
  }

  async function runAll() {
    // Only matters for the very first render before any real progress comes
    // in — pick whichever actually runs first so the label never briefly
    // names a provider that isn't even linked.
    const firstProvider: Provider = hasSteamLinked ? "steam" : hasPsnLinked ? "psn" : "xbox";
    await runSync(firstProvider, async () => {
      if (hasSteamLinked) await syncSteam((progress) => setState({ status: "syncing", provider: "steam", ...progress }));
      if (hasPsnLinked) await syncPsn((progress) => setState({ status: "syncing", provider: "psn", ...progress }));
      if (hasXboxLinked) await syncXbox((progress) => setState({ status: "syncing", provider: "xbox", ...progress }));
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
      runSync("steam", () => syncSteam((progress) => setState({ status: "syncing", provider: "steam", ...progress })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevHasPsnLinked = useRef(hasPsnLinked);
  useEffect(() => {
    const psnJustLinked = !autoStart && !prevHasPsnLinked.current && hasPsnLinked;
    prevHasPsnLinked.current = hasPsnLinked;
    if (psnJustLinked) {
      runSync("psn", () => syncPsn((progress) => setState({ status: "syncing", provider: "psn", ...progress })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPsnLinked]);

  const prevHasXboxLinked = useRef(hasXboxLinked);
  useEffect(() => {
    const xboxJustLinked = !autoStart && !prevHasXboxLinked.current && hasXboxLinked;
    prevHasXboxLinked.current = hasXboxLinked;
    if (xboxJustLinked) {
      runSync("xbox", () => syncXbox((progress) => setState({ status: "syncing", provider: "xbox", ...progress })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasXboxLinked]);

  if (state.status === "syncing") {
    const providerLabel = PROVIDER_LABELS[state.provider];
    const percent = state.total > 0 ? Math.round((state.done / state.total) * 100) : 0;
    const phaseLabel = state.pausedUntil
      ? t("xboxSyncPaused", { time: new Date(state.pausedUntil).toLocaleTimeString([], { timeStyle: "short" }) })
      : state.phase === "library"
        ? t("syncingLibrary")
        : t("syncingAchievements");
    const progressSuffix = state.pausedUntil ? "" : ` · ${state.done}/${state.total}`;

    return (
      <>
        <Button
          type="button"
          variant={variant}
          className={className}
          isLoading
          onClick={pausedUntil && overlayDismissed ? () => setOverlayDismissed(false) : undefined}
        >
          {providerLabel} · {phaseLabel}
          {progressSuffix}
        </Button>

        {pausedUntil && overlayDismissed ? null : (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
            <div className="relative flex w-full max-w-xs flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 text-center">
              {pausedUntil ? (
                <button
                  type="button"
                  aria-label={tCommon("close")}
                  onClick={() => setOverlayDismissed(true)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              ) : null}
              <p className="text-sm font-medium">
                {providerLabel} · {phaseLabel}
                {progressSuffix}
              </p>
              <p className="text-xs text-muted-foreground">
                {state.pausedUntil ? t("xboxSyncPausedDetail") : t("steamSyncWarning")}
              </p>
              {!state.pausedUntil ? (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-accent transition-[width]"
                    style={{ width: `${Math.max(4, percent)}%` }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <Button type="button" variant={variant} className={className} onClick={runAll}>
      {t("syncAll")}
    </Button>
  );
}
