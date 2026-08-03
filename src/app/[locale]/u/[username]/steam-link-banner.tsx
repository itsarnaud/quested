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
    <div className="flex flex-col items-start gap-3 rounded-md border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <SteamIcon width={22} height={22} className="shrink-0" />
        <p className="text-sm">{t("steamBanner")}</p>
      </div>
      <div className="flex w-full shrink-0 gap-2 sm:w-auto">
        <Button variant="secondary" className="flex-1 sm:flex-none" onClick={dismiss}>
          {t("steamBannerDismiss")}
        </Button>
        {/* A plain <a>, not Next's <Link> — this target redirects
            cross-origin to Steam, not a Next.js page. */}
        <a
          href={`/api/auth/steam/login?redirectTo=${encodeURIComponent(redirectTo)}`}
          onClick={setAnsweredCookie}
          className="flex-1 sm:flex-none"
        >
          <Button className="w-full">{t("steamBannerLink")}</Button>
        </a>
      </div>
    </div>
  );
}
