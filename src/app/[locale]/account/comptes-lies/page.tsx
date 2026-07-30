import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { LinkedAccounts } from "@/app/[locale]/account/linked-accounts";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AccountLinkedPage({ params }: PageProps) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect({ href: "/login", locale });
    return null;
  }

  return <LinkedAccounts userId={session.user.id} />;
}
