"use client";

import { signOut } from "next-auth/react";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { PersonIcon } from "@/components/icons/person-icon";
import { BellIcon } from "@/components/icons/bell-icon";
import { LinkIcon } from "@/components/icons/link-icon";
import { DownloadIcon } from "@/components/icons/download-icon";
import { AlertIcon } from "@/components/icons/alert-icon";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/account/profil", labelKey: "navProfile", icon: PersonIcon },
  { href: "/account/notifications", labelKey: "navNotifications", icon: BellIcon },
  { href: "/account/comptes-lies", labelKey: "navLinkedAccounts", icon: LinkIcon },
  { href: "/account/donnees", labelKey: "navData", icon: DownloadIcon },
  { href: "/account/danger", labelKey: "navDanger", icon: AlertIcon },
] as const;

export function AccountNav() {
  const pathname = usePathname();
  const t = useTranslations("Account");
  const isRoot = pathname === "/account";

  return (
    <nav className={cn("flex-col gap-1 sm:flex sm:w-56 sm:shrink-0", isRoot ? "flex" : "hidden sm:flex")}>
      {ITEMS.map(({ href, labelKey, icon: Icon }) => {
        const isActive = pathname === href;
        // On desktop, the root /account shows the Profil section by default
        // (see AccountContentWrapper), so highlight it there — but not on
        // the mobile list, where root is just a neutral menu, nothing chosen yet.
        const isDesktopDefault = isRoot && href === "/account/profil";
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              isActive && "bg-muted text-foreground",
              isDesktopDefault && !isActive && "sm:bg-muted sm:text-foreground",
            )}
          >
            <Icon className="size-5" />
            {t(labelKey)}
          </Link>
        );
      })}

      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
        >
          {t("signOut")}
        </button>
      </div>
    </nav>
  );
}
