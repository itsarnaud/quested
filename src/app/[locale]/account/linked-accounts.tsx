import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/google-icon";
import { DiscordIcon } from "@/components/icons/discord-icon";

const PROVIDERS = [
  { id: "google", name: "Google", labelKey: "linkGoogle", Icon: GoogleIcon } as const,
  { id: "discord", name: "Discord", labelKey: "linkDiscord", Icon: DiscordIcon } as const,
];

export async function LinkedAccounts({ userId }: { userId: string }) {
  const t = await getTranslations("Account");

  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { provider: true, providerLabel: true },
  });
  const accountsByProvider = new Map(accounts.map((a) => [a.provider, a.providerLabel]));

  async function unlink(provider: string) {
    "use server";
    const session = await auth();
    if (!session?.user) return;

    const currentAccounts = await prisma.account.findMany({
      where: { userId: session.user.id },
    });
    if (currentAccounts.length <= 1) return;

    await prisma.account.deleteMany({
      where: { userId: session.user.id, provider },
    });
    revalidatePath("/account");
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">{t("linkedAccountsTitle")}</h2>
      <p className="text-sm text-muted-foreground">{t("linkedAccountsDescription")}</p>

      <div className="flex flex-col gap-2">
        {PROVIDERS.map(({ id, name, labelKey, Icon }) => {
          const providerLabel = accountsByProvider.get(id);
          const isLinked = accountsByProvider.has(id);

          return (
            <div key={id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Icon />
                {isLinked ? (providerLabel ?? name) : t(labelKey)}
              </div>

              {isLinked ? (
                accountsByProvider.size > 1 ? (
                  <form action={unlink.bind(null, id)}>
                    <Button type="submit" variant="secondary">
                      {t("unlink")}
                    </Button>
                  </form>
                ) : (
                  <span className="text-sm text-muted-foreground">{t("linked")}</span>
                )
              ) : (
                <form
                  action={async () => {
                    "use server";
                    await signIn(id, { redirectTo: "/account" });
                  }}
                >
                  <Button type="submit" variant="secondary">
                    {t(labelKey)}
                  </Button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
