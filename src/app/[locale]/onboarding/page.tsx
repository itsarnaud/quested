import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingFlow } from "@/app/[locale]/onboarding/onboarding-flow";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Onboarding" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function OnboardingPage({ params }: PageProps) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect({ href: "/login", locale });
    return;
  }

  const [user, steamAccount] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { onboardedAt: true, onboardingStep: true, name: true, username: true, image: true },
    }),
    prisma.account.findFirst({ where: { userId: session.user.id, provider: "steam" } }),
  ]);

  if (user.onboardedAt) {
    redirect({ href: "/search", locale });
    return;
  }

  return (
    <OnboardingFlow
      initialStep={user.onboardingStep}
      profile={{ name: user.name, username: user.username, image: user.image }}
      hasSteamLinked={Boolean(steamAccount)}
    />
  );
}
