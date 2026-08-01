import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { LinkedAccounts } from "@/app/[locale]/account/linked-accounts";

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

  return <LinkedAccounts userId={session.user.id} error={error} />;
}
