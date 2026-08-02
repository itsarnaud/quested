"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SteamIcon } from "@/components/icons/steam-icon";
import { Button } from "@/components/ui/button";

const COOKIE_NAME = "quested-steam-banner-answered";

function hasAnsweredCookie() {
  return document.cookie.split("; ").some((row) => row.startsWith(`${COOKIE_NAME}=`));
}

function setAnsweredCookie() {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${COOKIE_NAME}=1; max-age=${oneYear}; path=/`;
}

export function SteamLinkBanner({ redirectTo }: { redirectTo: string }) {
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
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
          <SteamIcon />
        </div>
        <p className="text-sm">{t("steamBanner")}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" onClick={dismiss}>
          {t("steamBannerDismiss")}
        </Button>
        {/* A plain <a>, not Next's <Link> — this target redirects
            cross-origin to Steam, not a Next.js page. */}
        <a href={`/api/auth/steam/login?redirectTo=${encodeURIComponent(redirectTo)}`} onClick={setAnsweredCookie}>
          <Button>{t("steamBannerLink")}</Button>
        </a>
      </div>
    </div>
  );
}
