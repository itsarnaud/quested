"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { XboxIcon } from "@/components/icons/xbox-icon";
import { useBeforeUnloadWarning, useXboxSync, type SyncProgress } from "@/app/[locale]/account/use-provider-sync";

type SyncState = { status: "idle" } | ({ status: "syncing" } & SyncProgress);

export function XboxSyncButton({ className }: { className?: string }) {
  const t = useTranslations("Account");
  const [state, setState] = useState<SyncState>({ status: "idle" });
  const sync = useXboxSync();

  // Not active during a pause: there's no in-flight request to interrupt
  // while waiting for the shared Xbox budget to free up (unlike Steam/PSN,
  // which only ever pause between requests, never mid-wait) — closing the
  // tab there just means resuming manually later, nothing lost mid-flight.
  useBeforeUnloadWarning(state.status === "syncing" && !state.pausedUntil);

  async function runSync() {
    setState({ status: "syncing", phase: "library", done: 0, total: 0 });
    try {
      await sync((progress) => setState({ status: "syncing", ...progress }));
    } catch {
      toast.error(t("genericError"));
    } finally {
      setState({ status: "idle" });
    }
  }

  if (state.status === "syncing") {
    const percent = state.total > 0 ? Math.round((state.done / state.total) * 100) : 0;
    const label = state.pausedUntil
      ? t("xboxSyncPaused", { time: new Date(state.pausedUntil).toLocaleTimeString([], { timeStyle: "short" }) })
      : state.phase === "library"
        ? t("syncingLibrary")
        : t("syncingAchievements");

    return (
      <>
        <Button type="button" variant="secondary" className={className} isLoading>
          {label} {state.pausedUntil ? "" : `· ${state.done}/${state.total}`}
        </Button>

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-xs flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 text-center">
            <XboxIcon width={28} height={28} />
            <p className="text-sm font-medium">
              {label} {state.pausedUntil ? "" : `· ${state.done}/${state.total}`}
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
      </>
    );
  }

  return (
    <Button type="button" variant="secondary" className={className} onClick={runSync}>
      {t("syncXbox")}
    </Button>
  );
}
