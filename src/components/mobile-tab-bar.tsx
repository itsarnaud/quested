"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { HomeIcon } from "@/components/icons/home-icon";
import { SearchIcon } from "@/components/icons/search-icon";
import { PeopleIcon } from "@/components/icons/people-icon";
import { BellIcon } from "@/components/icons/bell-icon";
import { PersonIcon } from "@/components/icons/person-icon";

type Tab = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  showDot?: boolean;
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

  const { data: unreadCount } = trpc.notification.unreadCount.useQuery(undefined, {
    enabled: isLoggedIn,
    refetchInterval: 30_000,
  });

  const tabs: Tab[] = [
    { href: "/", label: t("home"), icon: HomeIcon },
    { href: "/search", label: t("search"), icon: SearchIcon },
    { href: "/people", label: t("people"), icon: PeopleIcon },
    ...(isLoggedIn
      ? [
          {
            href: "/notifications",
            label: t("notifications"),
            icon: BellIcon,
            showDot: Boolean(unreadCount),
          },
          { href: username ? `/u/${username}` : "/account", label: t("profile"), icon: PersonIcon },
        ]
      : [{ href: "/login", label: t("signIn"), icon: PersonIcon }]),
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map(({ href, label, icon: Icon, showDot }) => {
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
            <Icon className="size-7" />
            <span className="text-[11px] leading-none font-medium">{label}</span>
            {showDot ? (
              <span className="absolute right-[calc(50%-18px)] top-2 size-1.5 rounded-full bg-accent" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
