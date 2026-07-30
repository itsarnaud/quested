"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { HomeIcon } from "@/components/icons/home-icon";
import { SearchIcon } from "@/components/icons/search-icon";
import { PeopleIcon } from "@/components/icons/people-icon";
import { PersonIcon } from "@/components/icons/person-icon";

type Tab = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function MobileTabBar({
  isLoggedIn,
  username,
}: {
  isLoggedIn: boolean;
  username: string | null;
}) {
  const pathname = usePathname();
  const t = useTranslations("Header");

  // Notifications are reachable via the bell in the mobile top header
  // instead of a dedicated tab here — keeps this bar to 4 items.
  const tabs: Tab[] = [
    { href: "/", label: t("home"), icon: HomeIcon },
    { href: "/search", label: t("search"), icon: SearchIcon },
    { href: "/people", label: t("people"), icon: PeopleIcon },
    isLoggedIn
      ? { href: username ? `/u/${username}` : "/account", label: t("profile"), icon: PersonIcon }
      : { href: "/login", label: t("signIn"), icon: PersonIcon },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 py-3 text-muted-foreground",
              isActive && "text-accent",
            )}
          >
            {isActive ? (
              <motion.div
                layoutId="mobile-tab-active-indicator"
                className="absolute inset-x-3 top-0 h-0.5 bg-accent"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            ) : null}
            <Icon className="relative size-7" />
            <span className="relative text-[11px] leading-none font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
