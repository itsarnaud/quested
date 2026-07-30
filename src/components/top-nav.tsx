"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Logo } from "@/components/icons/logo";
import { SearchIcon } from "@/components/icons/search-icon";
import { NotificationBell } from "@/components/notification-bell";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TopNav({
  isLoggedIn,
  username,
  userImage,
  version,
}: {
  isLoggedIn: boolean;
  username: string | null;
  userImage: string | null;
  version: string | null;
}) {
  const t = useTranslations("Header");
  const tSearch = useTranslations("Search");
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: "/people", label: t("people") },
    ...(isLoggedIn ? [{ href: "/leaderboard", label: t("leaderboard") }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 hidden h-16 items-center gap-6 border-b border-border bg-background/95 px-6 backdrop-blur sm:flex">
      <Link href="/" className="flex shrink-0 items-center gap-2.5">
        <Logo width={24} height={24} />
        <span className="text-base font-bold uppercase tracking-tight">Quested</span>
      </Link>

      <form
        className="relative mx-auto w-full max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          const q = query.trim();
          router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
        }}
      >
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tSearch("placeholder")}
          className="h-10 w-full rounded-full border border-border bg-card pl-10 pr-4 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-accent"
        />
      </form>

      <nav className="flex shrink-0 items-center gap-1">
        {links.map(({ href, label }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                isActive && "text-foreground",
              )}
            >
              {label}
            </Link>
          );
        })}

        {isLoggedIn ? <NotificationBell /> : null}

        {isLoggedIn ? (
          <div className="relative ml-1">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-border bg-muted transition-opacity hover:opacity-90"
              aria-label={t("account")}
            >
              {userImage ? (
                <Image src={userImage} alt="" width={36} height={36} unoptimized className="size-full object-cover" />
              ) : (
                <span className="text-sm font-semibold uppercase">{(username ?? "?").slice(0, 1)}</span>
              )}
            </button>

            {menuOpen ? (
              <>
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-11 z-20 flex w-56 flex-col gap-1 rounded-md border border-border bg-card p-2 shadow-lg">
                  <Link
                    href={username ? `/u/${username}` : "/account"}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {t("profile")}
                  </Link>
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {t("settings")}
                  </Link>
                  <LocaleSwitcher variant="row" />
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="rounded-md px-2 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {t("signOut")}
                  </button>
                  {version ? (
                    <Link
                      href="/changelog"
                      onClick={() => setMenuOpen(false)}
                      className="border-t border-border px-2 pb-1 pt-2 text-xs text-muted-foreground/70 hover:text-muted-foreground"
                    >
                      {version}
                    </Link>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <div className="ml-1 flex items-center gap-2">
            <LocaleSwitcher />
            <Link href="/login">
              <Button variant="secondary">{t("signIn")}</Button>
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
