import { getLocale, getTranslations } from "next-intl/server";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons/logo";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export async function Header() {
  const [session, t, locale] = await Promise.all([
    auth(),
    getTranslations("Header"),
    getLocale(),
  ]);

  const homeHref = locale === routing.defaultLocale ? "/" : `/${locale}`;

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
        <Logo />
        Quested
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/search" className="text-muted-foreground hover:text-foreground">
          {t("search")}
        </Link>
        {session?.user ? (
          <>
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
              <Button type="submit" variant="secondary">
                {t("signOut")}
              </Button>
            </form>
          </>
        ) : (
          <Link href="/login">
            <Button variant="secondary">{t("signIn")}</Button>
          </Link>
        )}
      </nav>
    </header>
  );
}
