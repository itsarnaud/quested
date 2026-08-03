"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { usePushSubscription } from "@/lib/use-push-subscription";
import { Button } from "@/components/ui/button";

const COOKIE_NAME = "quested-push-banner-answered";

function hasAnsweredCookie() {
  return document.cookie.split("; ").some((row) => row.startsWith(`${COOKIE_NAME}=`));
}

function setAnsweredCookie() {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${COOKIE_NAME}=1; max-age=${oneYear}; path=/`;
}

export function PushNotificationBanner() {
  const t = useTranslations("Notifications");
  const tAccount = useTranslations("Account");
  const { supported, subscribed, loading, subscribe } = usePushSubscription();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Defer to a real timer callback rather than setting state synchronously
    // in the effect body.
    const id = setTimeout(() => setDismissed(hasAnsweredCookie()), 0);
    return () => clearTimeout(id);
  }, []);

  if (loading || !supported || subscribed || dismissed) return null;

  function dismiss() {
    setAnsweredCookie();
    setDismissed(true);
  }

  async function enable() {
    setAnsweredCookie();
    const result = await subscribe();
    if (result === "subscribed") toast.success(tAccount("pushEnabledToast"));
    else if (result === "denied") toast.error(tAccount("pushPermissionDenied"));
    else toast.error(tAccount("genericError"));
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
      <p className="text-sm">{t("pushBanner")}</p>
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" onClick={dismiss}>
          {t("pushBannerDismiss")}
        </Button>
        <Button onClick={enable}>{t("pushBannerEnable")}</Button>
      </div>
    </div>
  );
}
