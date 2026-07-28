import type { Metadata } from "next";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/google-icon";
import { DiscordIcon } from "@/components/icons/discord-icon";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-xs flex-col gap-6 text-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Continue with one of the providers below.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/search" });
            }}
          >
            <Button type="submit" variant="secondary" className="w-full gap-2">
              <GoogleIcon />
              Continue with Google
            </Button>
          </form>
          <form
            action={async () => {
              "use server";
              await signIn("discord", { redirectTo: "/search" });
            }}
          >
            <Button type="submit" variant="secondary" className="w-full gap-2">
              <DiscordIcon />
              Continue with Discord
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
