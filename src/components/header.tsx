import { auth } from "@/auth";
import { Logo } from "@/components/icons/logo";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { MobileTabBar } from "@/components/mobile-tab-bar";

// Desktop navigation lives in the Sidebar — this header is the mobile-only
// top bar (logo + notification bell + language), the sidebar takes over
// everything else from `sm` up.
export async function Header() {
  const session = await auth();

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-border px-6 sm:hidden">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Logo />
          Quested
        </Link>

        <div className="flex items-center gap-3">
          {session?.user ? <NotificationBell /> : null}
          <LocaleSwitcher />
        </div>
      </header>

      <MobileTabBar isLoggedIn={Boolean(session?.user)} username={session?.user?.username ?? null} />
    </>
  );
}
