import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export async function Header() {
  const session = await auth();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <Link href="/" className="text-sm font-semibold tracking-tight">
        Quested
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/search" className="text-muted-foreground hover:text-foreground">
          Search
        </Link>
        {session?.user ? (
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button type="submit" variant="secondary">
              Sign out
            </Button>
          </form>
        ) : (
          <Link href="/login">
            <Button variant="secondary">Sign in</Button>
          </Link>
        )}
      </nav>
    </header>
  );
}
