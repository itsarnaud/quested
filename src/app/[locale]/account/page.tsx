import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { AccountView } from "@/app/[locale]/account/account-view";
import { LinkedAccounts } from "@/app/[locale]/account/linked-accounts";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function AccountPage({ params }: PageProps) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect({ href: "/login", locale });
    return;
  }

  const t = await getTranslations("Account");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
      <LinkedAccounts userId={session.user.id} />
      <AccountView />
    </div>
  );
}
