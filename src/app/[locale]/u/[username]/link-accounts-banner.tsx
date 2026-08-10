"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SteamIcon } from "@/components/icons/steam-icon";
import { PsnIcon } from "@/components/icons/psn-icon";
import { XboxIcon } from "@/components/icons/xbox-icon";
import { Button } from "@/components/ui/button";

const COOKIE_NAME = "quested-link-banner-answered";

function hasAnsweredCookie() {
  return document.cookie.split("; ").some((row) => row.startsWith(`${COOKIE_NAME}=`));
}

function setAnsweredCookie() {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${COOKIE_NAME}=1; max-age=${oneYear}; path=/`;
}

// Mentions whichever of Steam/PSN/Xbox isn't linked yet, but links out to
// the settings page rather than embedding each provider's redirect
// button/username form inline — cramming all of them into one row got
// cluttered fast, and the settings page already has that UI.
export function LinkAccountsBanner({
  hasSteamLinked,
  hasPsnLinked,
  hasXboxLinked,
}: {
  hasSteamLinked: boolean;
  hasPsnLinked: boolean;
  hasXboxLinked: boolean;
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
          {!hasXboxLinked ? <XboxIcon width={22} height={22} /> : null}
        </div>
        <p className="text-sm">{t("linkAccountsBanner")}</p>
      </div>
      <div className="flex w-full shrink-0 gap-2 sm:w-auto">
        <Button variant="secondary" className="flex-1 sm:flex-none" onClick={dismiss}>
          {t("bannerDismiss")}
        </Button>
        <Link href="/account/comptes-lies" onClick={setAnsweredCookie} className="flex-1 sm:flex-none">
          <Button className="w-full">{t("linkAccountsBannerCta")}</Button>
        </Link>
      </div>
    </div>
  );
}
