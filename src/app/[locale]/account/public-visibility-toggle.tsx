"use client";

import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Switch } from "@/components/ui/switch";

type Provider = "steam" | "discord" | "psn";

const FIELD_BY_PROVIDER = {
  steam: "showSteamOnProfile",
  discord: "showDiscordOnProfile",
  psn: "showPsnOnProfile",
} as const;

export function PublicVisibilityToggle({ provider }: { provider: Provider }) {
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

  const field = FIELD_BY_PROVIDER[provider];
  const checked = prefs[field];

  return (
    <Switch
      checked={checked}
      onToggle={() => update.mutate({ ...prefs, [field]: !checked })}
      disabled={update.isPending}
      aria-label={t("showOnProfile")}
    />
  );
}
