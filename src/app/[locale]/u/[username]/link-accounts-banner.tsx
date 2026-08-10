"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SteamIcon } from "@/components/icons/steam-icon";
import { PsnIcon } from "@/components/icons/psn-icon";
import { Button } from "@/components/ui/button";
import { SteamLinkButton } from "@/app/[locale]/account/steam-link-button";
import { PsnLinkForm } from "@/app/[locale]/account/psn-link-form";

const COOKIE_NAME = "quested-link-banner-answered";

function hasAnsweredCookie() {
  return document.cookie.split("; ").some((row) => row.startsWith(`${COOKIE_NAME}=`));
}

function setAnsweredCookie() {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${COOKIE_NAME}=1; max-age=${oneYear}; path=/`;
}

// Generalized from the Steam-only banner it replaces — offers whichever of
// Steam/PSN isn't linked yet (Xbox to add later once it exists). Dismissal
// is shared across both: once answered, neither gets asked about again.
export function LinkAccountsBanner({
  redirectTo,
  hasSteamLinked,
  hasPsnLinked,
}: {
  redirectTo: string;
  hasSteamLinked: boolean;
  hasPsnLinked: boolean;
}) {
  const t = useTranslations("Account");
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Defer to a real timer callback rather than setting state synchronously
    // in the effect body.
    const id = setTimeout(() => setDismissed(hasAnsweredCookie()), 0);
    return () => clearTimeout(id);
  }, []);

  if (dismissed) return null;

  function dismiss() {
    setAnsweredCookie();
    setDismissed(true);
  }

  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex shrink-0 items-center gap-1.5">
          {!hasSteamLinked ? <SteamIcon width={22} height={22} /> : null}
          {!hasPsnLinked ? <PsnIcon width={22} height={22} /> : null}
        </div>
        <p className="text-sm">{t("linkAccountsBanner")}</p>
      </div>
      <div className="flex w-full flex-wrap shrink-0 gap-2 sm:w-auto">
        <Button variant="secondary" className="flex-1 sm:flex-none" onClick={dismiss}>
          {t("steamBannerDismiss")}
        </Button>
        {!hasSteamLinked ? (
          <SteamLinkButton
            href={`/api/auth/steam/login?redirectTo=${encodeURIComponent(redirectTo)}`}
            label={t("steamBannerLink")}
            className="flex-1 sm:flex-none"
            onNavigate={setAnsweredCookie}
          />
        ) : null}
        {!hasPsnLinked ? <PsnLinkForm className="flex flex-1 gap-2 sm:flex-none" /> : null}
      </div>
    </div>
  );
}
