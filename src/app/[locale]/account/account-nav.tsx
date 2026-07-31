"use client";

import { motion } from "motion/react";
import { signOut } from "next-auth/react";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/account/profil", labelKey: "navProfile" },
  { href: "/account/notifications", labelKey: "navNotifications" },
  { href: "/account/comptes-lies", labelKey: "navLinkedAccounts" },
  { href: "/account/donnees", labelKey: "navData" },
  { href: "/account/danger", labelKey: "navDanger" },
] as const;

export function AccountNav() {
  const pathname = usePathname();
  const t = useTranslations("Account");

  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border">
      {ITEMS.map(({ href, labelKey }) => {
        // The root /account shows the Profil section by default.
        const isActive = pathname === href || (pathname === "/account" && href === "/account/profil");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(labelKey)}
            {isActive ? (
              <motion.div
                layoutId="account-tabs-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-accent"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            ) : null}
          </Link>
        );
      })}

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="ml-auto shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:text-red-300 sm:hidden"
      >
        {t("signOut")}
      </button>
    </nav>
  );
}
