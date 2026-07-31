"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

export function ExportDataSection() {
  const t = useTranslations("Account");
  const utils = trpc.useUtils();

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
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t("exportDescription")}</p>
      <Button className="w-fit rounded-full" onClick={handleExport}>
        {t("exportButton")}
      </Button>
    </div>
  );
}
