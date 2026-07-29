"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

export function AccountView() {
  const t = useTranslations("Account");
  const utils = trpc.useUtils();
  const [confirming, setConfirming] = useState(false);

  const deleteAccount = trpc.user.deleteAccount.useMutation({
    onSuccess: () => signOut({ callbackUrl: "/" }),
  });

  async function handleExport() {
    const data = await utils.user.exportData.fetch();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quested-data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="sm:hidden">
        <Button variant="secondary" className="w-fit" onClick={() => signOut({ callbackUrl: "/" })}>
          {t("signOut")}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">{t("exportTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("exportDescription")}</p>
        <Button variant="secondary" className="w-fit" onClick={handleExport}>
          {t("exportButton")}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">{t("deleteTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("deleteDescription")}</p>

        {confirming ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-red-600">{t("deleteConfirm")}</p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="w-fit border-red-600 text-red-600 hover:bg-red-50"
                onClick={() => deleteAccount.mutate()}
                disabled={deleteAccount.isPending}
              >
                {t("deleteConfirmButton")}
              </Button>
              <Button variant="secondary" className="w-fit" onClick={() => setConfirming(false)}>
                {t("cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="secondary"
            className="w-fit border-red-600 text-red-600 hover:bg-red-50"
            onClick={() => setConfirming(true)}
          >
            {t("deleteButton")}
          </Button>
        )}
      </div>
    </div>
  );
}
