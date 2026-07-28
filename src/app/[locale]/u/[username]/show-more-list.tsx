"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const PAGE_SIZE = 10;

export function ShowMoreList({ items }: { items: React.ReactNode[] }) {
  const t = useTranslations("Profile");
  const [visible, setVisible] = useState(PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col divide-y divide-border">{items.slice(0, visible)}</div>

      {visible < items.length ? (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
          className="w-fit text-sm text-muted-foreground hover:text-foreground"
        >
          {t("showMore")}
        </button>
      ) : null}
    </div>
  );
}
