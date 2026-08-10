import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { LinkedAccounts } from "@/app/[locale]/account/linked-accounts";
import { ToastOnMount } from "@/components/toast-on-mount";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function AccountLinkedPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { error } = await searchParams;
  const session = await auth();
  if (!session?.user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const t = await getTranslations("Account");

  return (
    <>
      {/* No ToastOnMount for steamLinked here — SyncAllButton (inside
          LinkedAccounts) reads and strips that same query param itself to
          auto-start a sync, and its own progress UI + completion toast is
          feedback enough; a separate "account linked" toast would just race
          it for who gets to read/strip the param first. */}
      {error === "steam-taken" ? (
        <ToastOnMount message={t("steamAlreadyLinked")} variant="error" paramToStrip="error" />
      ) : null}
      <LinkedAccounts userId={session.user.id} />
    </>
  );
}
