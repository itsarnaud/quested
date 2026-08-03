"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

export function DeleteAccountSection() {
  const t = useTranslations("Account");
  const [understood, setUnderstood] = useState(false);

  const deleteAccount = trpc.user.deleteAccount.useMutation({
    onSuccess: () => signOut({ callbackUrl: "/" }),
    onError: () => toast.error(t("genericError")),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-lg border border-red-500/40 bg-red-500/5 p-4">
        <h2 className="text-sm font-semibold text-red-400">{t("dangerZoneTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("deleteDescription")}</p>
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={understood}
          onChange={(e) => setUnderstood(e.target.checked)}
          className="size-4 rounded border-border accent-accent transition-transform active:scale-90"
        />
        {t("deleteUnderstand")}
      </label>

      <Button
        className="w-fit rounded-full bg-red-600 text-white hover:opacity-90"
        onClick={() => deleteAccount.mutate()}
        disabled={!understood || deleteAccount.isPending}
      >
        {t("deleteButton")}
      </Button>
    </div>
  );
}
