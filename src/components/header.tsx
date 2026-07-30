import { getLocale, getTranslations } from "next-intl/server";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons/logo";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { MobileTabBar } from "@/components/mobile-tab-bar";

export async function Header() {
  const [session, t, locale] = await Promise.all([
    auth(),
    getTranslations("Header"),
    getLocale(),
  ]);

  const homeHref = locale === routing.defaultLocale ? "/" : `/${locale}`;

  return (
    <>
      <header className="relative flex h-14 items-center justify-between border-b border-border px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Logo />
          Quested
        </Link>

        <div className="flex items-center gap-3">
          <nav className="hidden items-center gap-4 text-sm sm:flex">
            <Link href="/search" className="text-muted-foreground hover:text-foreground">
              {t("search")}
            </Link>
            <Link href="/people" className="text-muted-foreground hover:text-foreground">
              {t("people")}
            </Link>
            {session?.user ? (
              <>
                <Link href="/leaderboard" className="text-muted-foreground hover:text-foreground">
                  {t("leaderboard")}
                </Link>
                {session.user.username ? (
                  <Link
                    href={`/u/${session.user.username}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {t("profile")}
                  </Link>
                ) : null}
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: homeHref });
                  }}
                >
                  <Button type="submit" variant="secondary" className="w-full sm:w-auto">
                    {t("signOut")}
                  </Button>
                </form>
              </>
            ) : (
              <Link href="/login">
                <Button variant="secondary" className="w-full sm:w-auto">
                  {t("signIn")}
                </Button>
              </Link>
            )}
            <LocaleSwitcher />
          </nav>

          <div className="hidden sm:block">{session?.user ? <NotificationBell /> : null}</div>
          <div className="sm:hidden">
            <LocaleSwitcher />
          </div>
        </div>
      </header>

      <MobileTabBar isLoggedIn={Boolean(session?.user)} username={session?.user?.username ?? null} />
    </>
  );
}
