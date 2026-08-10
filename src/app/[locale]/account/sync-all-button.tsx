"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useBeforeUnloadWarning,
  useSteamSync,
  usePsnSync,
  type SyncProgress,
} from "@/app/[locale]/account/use-provider-sync";

type Provider = "steam" | "psn";
type SyncState = { status: "idle" } | ({ status: "syncing"; provider: Provider } & SyncProgress);

// One generic button syncs whichever provider(s) are linked, one after
// another — avoids the width/wrapping issues of showing a button per
// provider when both Steam and PSN are linked, and doesn't name which
// provider is running until it's actually mid-sync.
//
// Auto-triggers itself right after a provider gets linked, wherever it's
// rendered, by detecting the link rather than needing per-page wiring:
// - Steam links via a full-page OAuth redirect, landing back with
//   ?steamLinked=1 (see /api/auth/steam/callback) — that survives the
//   reload, unlike React state.
// - PSN links inline (no navigation), so this watches its own
//   hasPsnLinked prop flip from false to true. That only works if the
//   button was already mounted before the link happened — in onboarding
//   it isn't, so `autoStart` is the escape hatch: onboarding passes it
//   unconditionally since every provider linked there is brand new.
export function SyncAllButton({
  hasSteamLinked,
  hasPsnLinked,
  autoStart = false,
  variant = "secondary",
  className,
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

  const syncSteam = useSteamSync();
  const syncPsn = usePsnSync();

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
    await runSync(hasSteamLinked ? "steam" : "psn", async () => {
      if (hasSteamLinked) await syncSteam((progress) => setState({ status: "syncing", provider: "steam", ...progress }));
      if (hasPsnLinked) await syncPsn((progress) => setState({ status: "syncing", provider: "psn", ...progress }));
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
