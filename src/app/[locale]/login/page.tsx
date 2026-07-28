import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/google-icon";
import { DiscordIcon } from "@/components/icons/discord-icon";
import { routing } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Login" });
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations("Login");
  const searchHref = locale === routing.defaultLocale ? "/search" : `/${locale}/search`;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-xs flex-col gap-6 text-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-col gap-2">
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
    </div>
  );
}
