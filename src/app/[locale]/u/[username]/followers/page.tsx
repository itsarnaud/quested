import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { FollowList } from "@/app/[locale]/u/[username]/follow-list";

type PageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  return { title: `Followers — @${username}` };
}

export default async function FollowersPage({ params }: PageProps) {
  const { username } = await params;

  const [user, t] = await Promise.all([
    prisma.user.findUnique({ where: { username }, select: { id: true } }),
    getTranslations("Follow"),
  ]);
  if (!user) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <Link href={`/u/${username}`} className="w-fit text-sm text-muted-foreground hover:text-foreground">
        ← {t("backToProfile")}
      </Link>
      <h1 className="text-xl font-semibold capitalize tracking-tight">{t("followers")}</h1>
      <FollowList username={username} type="followers" />
    </div>
  );
}
