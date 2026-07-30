"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function AccountContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("Account");
  const isRoot = pathname === "/account";

  return (
    <div className={cn("min-w-0 flex-1 flex-col gap-6 sm:flex", isRoot ? "hidden" : "flex")}>
      <Link href="/account" className="w-fit text-sm text-muted-foreground hover:text-foreground sm:hidden">
        ← {t("title")}
      </Link>
      {children}
    </div>
  );
}
