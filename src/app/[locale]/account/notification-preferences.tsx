"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Switch } from "@/components/ui/switch";

export function NotificationPreferences() {
  const t = useTranslations("Account");
  const utils = trpc.useUtils();
  const { data: prefs } = trpc.user.getNotificationPreferences.useQuery();

  const update = trpc.user.updateNotificationPreferences.useMutation({
    onSuccess: () => utils.user.getNotificationPreferences.invalidate(),
  });

  if (!prefs) return null;

  const rows = [
    { key: "emailOnFollow", label: t("notifyOnFollow") },
    { key: "emailOnLike", label: t("notifyOnLike") },
    { key: "emailOnRelease", label: t("notifyOnRelease") },
  ] as const;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold">{t("notificationsTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("notificationsDescription")}</p>
      </div>

      <div className="flex flex-col divide-y divide-border">
        {rows.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between gap-4 py-4">
            <span className="text-sm font-medium">{label}</span>
            <Switch
              checked={prefs[key]}
              onToggle={() => update.mutate({ ...prefs, [key]: !prefs[key] })}
              disabled={update.isPending}
              aria-label={label}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
