import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { ListDetail } from "@/app/[locale]/u/[username]/lists/[listId]/list-detail";

type PageProps = {
  params: Promise<{ username: string; listId: string }>;
};

async function getList(listId: string) {
  return prisma.gameList.findUnique({
    where: { id: listId },
    include: {
      user: { select: { username: true, name: true } },
      items: { include: { game: true }, orderBy: { position: "asc" } },
    },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { listId } = await params;
  const list = await getList(listId);
  if (!list) return {};
  return { title: `${list.title} — ${list.user.name ?? list.user.username}` };
}

export default async function ListDetailPage({ params }: PageProps) {
  const { username, listId } = await params;

  const [list, session, t] = await Promise.all([getList(listId), auth(), getTranslations("Lists")]);

  if (!list || list.user.username !== username) notFound();

  const canEdit = session?.user?.id === list.userId;
  const canClone = Boolean(session?.user) && !canEdit;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <Link href={`/u/${username}`} className="w-fit text-sm text-muted-foreground hover:text-foreground">
        ← {t("backToProfile")}
      </Link>

      <ListDetail
        username={username}
        listId={list.id}
        initialTitle={list.title}
        initialDescription={list.description}
        initialItems={list.items.map((item) => item.game)}
        canEdit={canEdit}
        canClone={canClone}
      />
    </div>
  );
}
