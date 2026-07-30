"use client";

import { useTranslations } from "next-intl";
import { usePushSubscription } from "@/lib/use-push-subscription";
import { Button } from "@/components/ui/button";

export function PushNotificationsSection() {
  const t = useTranslations("Account");
  const { supported, subscribed, loading, subscribe, unsubscribe } = usePushSubscription();

  if (loading) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">{t("pushTitle")}</h2>
      <p className="text-sm text-muted-foreground">
        {supported ? t("pushDescription") : t("pushUnsupported")}
      </p>
      {supported ? (
        <Button variant="secondary" className="w-fit" onClick={() => (subscribed ? unsubscribe() : subscribe())}>
          {subscribed ? t("pushDisable") : t("pushEnable")}
        </Button>
      ) : null}
    </div>
  );
}
