"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { trpc } from "@/lib/trpc/client";
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

      {/* Keyed by pathname so it remounts (clearing its own query state)
          on every route change — it's just a shortcut to /search, not a
          persistent reflection of the current page. */}
      <NavSearchForm key={pathname} placeholder={tSearch("placeholder")} router={router} />

      <nav className="ml-auto flex shrink-0 items-center gap-1">
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

const NavSearchForm = ({ placeholder, router }: { placeholder: string; router: ReturnType<typeof useRouter> }) => {
  const tSearch = useTranslations("Search");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(id);
  }, [query]);

  const isSearching = debouncedQuery.trim().length > 1;

  const { data: results } = trpc.game.search.useQuery({ query: debouncedQuery }, { enabled: isSearching });
  const { data: suggestions } = trpc.game.relatedSuggestions.useQuery(
    { query: debouncedQuery },
    { enabled: isSearching },
  );

  const goToFullResults = () => {
    const q = query.trim();
    setOpen(false);
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  return (
    <div className="relative w-full max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goToFullResults();
        }}
      >
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="h-10 w-full rounded-full border border-border bg-card pl-10 pr-4 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-accent"
        />
      </form>

      {open && isSearching ? (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 top-12 z-20 flex max-h-[28rem] flex-col gap-1 overflow-y-auto rounded-md border border-border bg-card p-2 shadow-lg">
            {results && results.length > 0 ? (
              results.slice(0, 6).map((game) => (
                <Link
                  key={game.id}
                  href={`/games/${game.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <div className="relative h-10 w-8 shrink-0 overflow-hidden rounded border border-border bg-muted">
                    {game.coverUrl ? (
                      <Image src={game.coverUrl} alt="" fill unoptimized className="object-cover" />
                    ) : null}
                  </div>
                  <span className="min-w-0 flex-1 truncate">{game.title}</span>
                  {game.releaseYear ? (
                    <span className="shrink-0 text-xs text-muted-foreground">{game.releaseYear}</span>
                  ) : null}
                </Link>
              ))
            ) : (
              <p className="px-2 py-3 text-sm text-muted-foreground">{tSearch("noResults")}</p>
            )}

            {suggestions ? (
              <div className="mt-1 flex flex-col gap-1 border-t border-border pt-2">
                <span className="px-2 text-xs text-muted-foreground">
                  {tSearch("suggestionsBasedOn", { game: suggestions.basedOnTitle })}
                </span>
                {suggestions.games.map((game) => (
                  <Link
                    key={game.id}
                    href={`/games/${game.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <div className="relative h-10 w-8 shrink-0 overflow-hidden rounded border border-border bg-muted">
                      {game.coverUrl ? (
                        <Image src={game.coverUrl} alt="" fill unoptimized className="object-cover" />
                      ) : null}
                    </div>
                    <span className="min-w-0 flex-1 truncate">{game.title}</span>
                  </Link>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              onClick={goToFullResults}
              className="mt-1 rounded px-2 py-2 text-center text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {tSearch("viewAllResults")}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
};
