import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/google-icon";
import { DiscordIcon } from "@/components/icons/discord-icon";
import { GameGrid } from "@/components/game-grid";
import { FeaturedHero } from "@/components/featured-hero";
import { HomeWidgets } from "@/components/home-widgets";
import { routing } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Login" });
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { error } = await searchParams;
  const [t, tHome, popularGames] = await Promise.all([
    getTranslations("Login"),
    getTranslations("Home"),
    prisma.game.findMany({ orderBy: { logs: { _count: "desc" } }, take: 24 }),
  ]);
  const searchHref = locale === routing.defaultLocale ? "/search" : `/${locale}/search`;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 gap-10 px-6 py-10">
      <div className="flex min-w-0 flex-1 flex-col gap-12 pt-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>

          {error === "OAuthAccountNotLinked" ? (
            <p className="rounded-md border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-400">
              {t("accountNotLinked")}
            </p>
          ) : null}

          <div className="flex w-full max-w-xs flex-col gap-2">
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: searchHref });
              }}
            >
              <Button type="submit" variant="secondary" className="w-full gap-2">
                <GoogleIcon />
                {t("continueWithGoogle")}
              </Button>
            </form>
            <form
              action={async () => {
                "use server";
                await signIn("discord", { redirectTo: searchHref });
              }}
            >
              <Button type="submit" variant="secondary" className="w-full gap-2">
                <DiscordIcon />
                {t("continueWithDiscord")}
              </Button>
            </form>
          </div>
        </div>

        <FeaturedHero />

        {popularGames.length > 0 ? (
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold tracking-tight">{tHome("popularTitle")}</h2>
            <GameGrid games={popularGames} />
          </div>
        ) : null}
      </div>

      <HomeWidgets userId={null} />
    </div>
  );
}
