import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { PushNotificationBanner } from "@/components/push-notification-banner";
import { formatRelativeTime } from "@/lib/format-relative-time";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Notifications" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function NotificationsPage({ params }: PageProps) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect({ href: "/login", locale });
    return;
  }

  const t = await getTranslations("Notifications");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    include: {
      actor: { select: { username: true, name: true, image: true } },
      log: { select: { game: { select: { slug: true, title: true } } } },
      game: { select: { slug: true, title: true, coverUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>

      <PushNotificationBanner />

      {notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={
                n.type === "RELEASE" && n.game
                  ? `/games/${n.game.slug}`
                  : n.type === "LIKE" && n.log
                    ? `/games/${n.log.game.slug}`
                    : `/u/${n.actor?.username}`
              }
              className="flex items-center gap-4 py-4 transition-colors hover:bg-muted/50"
            >
              <div className="relative size-11 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                {n.type === "RELEASE" && n.game?.coverUrl ? (
                  <Image src={n.game.coverUrl} alt={n.game.title} fill sizes="44px" className="object-cover" />
                ) : n.actor?.image ? (
                  <Image
                    src={n.actor.image}
                    alt={n.actor.username ?? ""}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm">
                  {n.type === "RELEASE" && n.game ? (
                    t("gameReleased", { game: n.game.title })
                  ) : (
                    <>
                      <span className="font-semibold">{n.actor?.name ?? `@${n.actor?.username}`}</span>{" "}
                      {n.type === "LIKE" && n.log ? t("liked", { game: n.log.game.title }) : t("startedFollowing")}
                    </>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(n.createdAt, locale)}</span>
              </div>
              {!n.read ? <span className="size-2 shrink-0 rounded-full bg-accent" /> : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
