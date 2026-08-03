import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { LinkedAccounts } from "@/app/[locale]/account/linked-accounts";
import { ToastOnMount } from "@/components/toast-on-mount";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; steamLinked?: string }>;
};

export default async function AccountLinkedPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { error, steamLinked } = await searchParams;
  const session = await auth();
  if (!session?.user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const t = await getTranslations("Account");

  return (
    <>
      {steamLinked === "1" ? <ToastOnMount message={t("steamLinked")} paramToStrip="steamLinked" /> : null}
      {error === "steam-taken" ? (
        <ToastOnMount message={t("steamAlreadyLinked")} variant="error" paramToStrip="error" />
      ) : null}
      <LinkedAccounts userId={session.user.id} />
    </>
  );
}
