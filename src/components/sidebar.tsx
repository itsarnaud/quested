"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons/logo";
import { SearchIcon } from "@/components/icons/search-icon";
import { PeopleIcon } from "@/components/icons/people-icon";
import { TrophyIcon } from "@/components/icons/trophy-icon";
import { BellIcon } from "@/components/icons/bell-icon";
import { PersonIcon } from "@/components/icons/person-icon";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  showDot?: boolean;
};

export function Sidebar({
  isLoggedIn,
  username,
  version,
}: {
  isLoggedIn: boolean;
  username: string | null;
  version: string | null;
}) {
  const pathname = usePathname();
  const t = useTranslations("Header");

  const { data: unreadCount } = trpc.notification.unreadCount.useQuery(undefined, {
    enabled: isLoggedIn,
    refetchInterval: 30_000,
  });

  const items: NavItem[] = [
    { href: "/search", label: t("search"), icon: SearchIcon },
    { href: "/people", label: t("people"), icon: PeopleIcon },
    ...(isLoggedIn
      ? [
          { href: "/leaderboard", label: t("leaderboard"), icon: TrophyIcon },
          {
            href: "/notifications",
            label: t("notifications"),
            icon: BellIcon,
            showDot: Boolean(unreadCount),
          },
          { href: username ? `/u/${username}` : "/account", label: t("profile"), icon: PersonIcon },
        ]
      : []),
  ];

  return (
    <aside className="hidden shrink-0 flex-col justify-between border-r border-border px-4 py-6 sm:sticky sm:top-0 sm:flex sm:h-screen sm:w-60">
      <div className="flex flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 px-2 text-sm font-semibold tracking-tight">
          <Logo />
          Quested
        </Link>

        <nav className="flex flex-col gap-1">
          {items.map(({ href, label, icon: Icon, showDot }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                  isActive && "bg-muted text-foreground",
                )}
              >
                <Icon className="size-5" />
                {label}
                {showDot ? <span className="absolute left-6 top-1.5 size-1.5 rounded-full bg-accent" /> : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-3">
        <LocaleSwitcher variant="row" />
        {isLoggedIn ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            {t("signOut")}
          </Button>
        ) : (
          <Link href="/login">
            <Button variant="secondary" className="w-full">
              {t("signIn")}
            </Button>
          </Link>
        )}
        {version ? (
          <Link
            href="/changelog"
            className="px-2 text-xs text-muted-foreground/70 hover:text-muted-foreground"
          >
            {version}
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
