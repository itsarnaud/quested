import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { AchievementsCarousel } from "@/app/[locale]/games/[slug]/achievements-carousel";

export async function AchievementsSection({ gameId, userId }: { gameId: string; userId?: string }) {
  const achievements = await prisma.achievement.findMany({
    where: { gameId },
    include: { unlockedBy: { where: { userId: userId ?? "" } } },
    orderBy: { displayName: "asc" },
  });
  if (achievements.length === 0) return null;

  const t = await getTranslations("GamePage");

  const items = achievements
    .map((a) => ({
      id: a.id,
      displayName: a.displayName,
      description: a.description,
      unlocked: a.unlockedBy.length > 0,
      iconUrl: a.unlockedBy.length > 0 ? a.iconUrl : a.iconGrayUrl,
    }))
    // Unlocked first — the more interesting/relevant page to land on.
    .sort((a, b) => Number(b.unlocked) - Number(a.unlocked));

  const unlockedCount = items.filter((a) => a.unlocked).length;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-bold tracking-tight">
        {t("achievementsTitle")}{" "}
        <span className="text-sm font-normal text-muted-foreground">
          {unlockedCount}/{items.length}
        </span>
      </h2>
      <AchievementsCarousel achievements={items} />
    </div>
  );
}
