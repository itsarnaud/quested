"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { SteamIcon } from "@/components/icons/steam-icon";
import { SteamSyncButton } from "@/app/[locale]/account/steam-sync-button";

// Shown right after a successful Steam link (redirected with ?steamLinked=1)
// — linking alone imports nothing, so without this the user has no reason
// to know they still need to trigger a sync, or where to find that button.
export function SteamLinkedBanner() {
  const t = useTranslations("Account");

  useEffect(() => {
    // Strip the query param so a plain refresh doesn't keep re-showing this
    // one-time banner — history-only, no navigation/re-render triggered.
    const url = new URL(window.location.href);
    url.searchParams.delete("steamLinked");
    window.history.replaceState({}, "", url);
  }, []);

  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-md border border-border bg-card p-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <SteamIcon width={22} height={22} className="shrink-0" />
        <p className="text-sm">{t("steamLinkedBanner")}</p>
      </div>
      <SteamSyncButton />
    </div>
  );
}
