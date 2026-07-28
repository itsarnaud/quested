"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";

export function TasteComparison({ username }: { username: string }) {
  const t = useTranslations("Profile");
  const { data } = trpc.user.compareTaste.useQuery({ username });

  if (!data || data.commonCount === 0) return null;

  return (
    <p className="text-sm text-muted-foreground">
      {t("tasteCommon", { count: data.commonCount })}
      {data.similarity != null ? ` · ${t("tasteSimilarity", { percent: data.similarity })}` : ""}
    </p>
  );
}
