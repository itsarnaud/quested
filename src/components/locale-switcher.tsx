"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { FrFlag } from "@/components/icons/flags/fr-flag";
import { GbFlag } from "@/components/icons/flags/gb-flag";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const nextLocale = locale === "fr" ? "en" : "fr";

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
