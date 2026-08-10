"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SteamIcon } from "@/components/icons/steam-icon";
import { useBeforeUnloadWarning, useSteamSync, type SyncProgress } from "@/app/[locale]/account/use-provider-sync";

type SyncState = { status: "idle" } | ({ status: "syncing" } & SyncProgress);

export function SteamSyncButton({ className }: { className?: string }) {
  const t = useTranslations("Account");
  const [state, setState] = useState<SyncState>({ status: "idle" });
  const sync = useSteamSync();

  useBeforeUnloadWarning(state.status === "syncing");

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
    const label = state.phase === "library" ? t("syncingLibrary") : t("syncingAchievements");
    const percent = state.total > 0 ? Math.round((state.done / state.total) * 100) : 0;

    return (
      <>
        <Button type="button" variant="secondary" className={className} isLoading>
          {label} · {state.done}/{state.total}
        </Button>

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-xs flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 text-center">
            <SteamIcon width={28} height={28} />
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
      {t("syncSteam")}
    </Button>
  );
}
