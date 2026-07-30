"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { FrFlag } from "@/components/icons/flags/fr-flag";
import { GbFlag } from "@/components/icons/flags/gb-flag";

export function LocaleSwitcher({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const locale = useLocale();
  const pathname = usePathname();
  const nextLocale = locale === "fr" ? "en" : "fr";
  const label = locale === "fr" ? "Français" : "English";

  if (variant === "row") {
    return (
      <Link
        href={pathname}
        locale={nextLocale}
        className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border">
          {locale === "fr" ? <FrFlag /> : <GbFlag />}
        </span>
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={pathname}
      locale={nextLocale}
      className="flex size-7 items-center justify-center overflow-hidden rounded-full border border-border transition-opacity hover:opacity-80"
      aria-label={nextLocale === "en" ? "Switch to English" : "Passer en français"}
    >
      {locale === "fr" ? <FrFlag /> : <GbFlag />}
    </Link>
  );
}
