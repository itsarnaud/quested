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
      <p className="text-sm text-muted-foreground">{t("linkedAccountsDescription")}</p>

      <div className="flex flex-col divide-y divide-border">
        {PROVIDERS.map(({ id, name, labelKey, Icon }) => {
          const providerLabel = accountsByProvider.get(id);
          const isLinked = accountsByProvider.has(id);

          return (
            <div key={id} className="flex items-center justify-between gap-4 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                  <Icon />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">
                    {isLinked ? (providerLabel ?? name) : name}
                  </span>
                  <span className={isLinked ? "text-xs text-green-400" : "text-xs text-muted-foreground"}>
                    {isLinked ? t("linked") : t("notLinked")}
                  </span>
                </div>
              </div>

              {isLinked ? (
                accountsByProvider.size > 1 ? (
                  <form action={unlink.bind(null, id)}>
                    <Button type="submit" variant="secondary" className="rounded-full">
                      {t("unlink")}
                    </Button>
                  </form>
                ) : null
              ) : (
                <form
                  action={async () => {
                    "use server";
                    await signIn(id, { redirectTo: "/account" });
                  }}
                >
                  <Button type="submit" className="rounded-full">
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
