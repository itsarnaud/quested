"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";

export function NotificationPreferences() {
  const t = useTranslations("Account");
  const utils = trpc.useUtils();
  const { data: prefs } = trpc.user.getNotificationPreferences.useQuery();

  const update = trpc.user.updateNotificationPreferences.useMutation({
    onSuccess: () => utils.user.getNotificationPreferences.invalidate(),
  });

  if (!prefs) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">{t("notificationsTitle")}</h2>
      <p className="text-sm text-muted-foreground">{t("notificationsDescription")}</p>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={prefs.emailOnFollow}
          onChange={(e) => update.mutate({ ...prefs, emailOnFollow: e.target.checked })}
          className="size-4 rounded border-border accent-accent"
        />
        {t("notifyOnFollow")}
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={prefs.emailOnLike}
          onChange={(e) => update.mutate({ ...prefs, emailOnLike: e.target.checked })}
          className="size-4 rounded border-border accent-accent"
        />
        {t("notifyOnLike")}
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={prefs.emailOnRelease}
          onChange={(e) => update.mutate({ ...prefs, emailOnRelease: e.target.checked })}
          className="size-4 rounded border-border accent-accent"
        />
        {t("notifyOnRelease")}
      </label>
    </div>
  );
}
