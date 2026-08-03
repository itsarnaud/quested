"use client";

import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { usePushSubscription } from "@/lib/use-push-subscription";
import { Switch } from "@/components/ui/switch";

export function PushNotificationsSection() {
  const t = useTranslations("Account");
  const { supported, subscribed, loading, subscribe, unsubscribe } = usePushSubscription();

  if (loading) return null;

  async function handleToggle() {
    if (subscribed) {
      const result = await unsubscribe();
      if (result === "unsubscribed") toast.success(t("pushDisabledToast"));
      else toast.error(t("genericError"));
      return;
    }

    const result = await subscribe();
    if (result === "subscribed") toast.success(t("pushEnabledToast"));
    else if (result === "denied") toast.error(t("pushPermissionDenied"));
    else toast.error(t("genericError"));
  }

  return (
    <div className="flex items-center justify-between gap-4 border-t border-border py-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">{t("pushTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {supported ? t("pushDescription") : t("pushUnsupported")}
        </p>
      </div>
      {supported ? <Switch checked={subscribed} onToggle={handleToggle} aria-label={t("pushTitle")} /> : null}
    </div>
  );
}
