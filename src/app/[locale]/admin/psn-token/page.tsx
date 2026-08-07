import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PsnTokenForm } from "@/app/[locale]/admin/psn-token/psn-token-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "PSN token", robots: { index: false, follow: false } };
}

export default async function PsnTokenAdminPage() {
  const session = await auth();
  // Hides its existence for anyone else, rather than a login-style redirect
  // that reveals a gated route lives here.
  if (!session?.user?.email || session.user.email !== process.env.ALERT_EMAIL_TO) {
    notFound();
  }

  const token = await prisma.psnServiceToken.findUnique({ where: { id: "singleton" } });

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Token de service PSN</h1>
        <p className="text-sm text-muted-foreground">
          {token
            ? `Refresh token valide jusqu'au ${token.refreshTokenExpiresAt.toLocaleDateString("fr-FR")}.`
            : "Aucun token configuré pour l'instant."}
        </p>
      </div>

      <PsnTokenForm />
    </div>
  );
}
