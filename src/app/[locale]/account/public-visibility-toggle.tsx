"use client";

import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Switch } from "@/components/ui/switch";

export function PublicVisibilityToggle({ provider }: { provider: "steam" | "discord" }) {
  const t = useTranslations("Account");
  const utils = trpc.useUtils();
  const { data: prefs } = trpc.user.getPrivacyPreferences.useQuery();
  const update = trpc.user.updatePrivacyPreferences.useMutation({
    onSuccess: () => {
      utils.user.getPrivacyPreferences.invalidate();
      toast.success(t("saved"));
    },
    onError: () => toast.error(t("genericError")),
  });

  if (!prefs) return null;

  const checked = provider === "steam" ? prefs.showSteamOnProfile : prefs.showDiscordOnProfile;

  return (
    <Switch
      checked={checked}
      onToggle={() =>
        update.mutate({
          showSteamOnProfile: provider === "steam" ? !checked : prefs.showSteamOnProfile,
          showDiscordOnProfile: provider === "discord" ? !checked : prefs.showDiscordOnProfile,
        })
      }
      disabled={update.isPending}
      aria-label={t("showOnProfile")}
    />
  );
}
