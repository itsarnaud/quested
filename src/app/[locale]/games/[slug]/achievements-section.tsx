import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { AchievementsCarousel } from "@/app/[locale]/games/[slug]/achievements-carousel";
import { PlatinumIcon } from "@/components/icons/platinum-icon";

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
      globalUnlockedPercent: a.globalUnlockedPercent,
    }))
    .sort((a, b) => {
      // Unlocked first — the more interesting/relevant page to land on.
      if (a.unlocked !== b.unlocked) return Number(b.unlocked) - Number(a.unlocked);
      // Then rarest first within each group (lower % = rarer); achievements
      // Steam never reports a global percent for sort last, not first.
      const aPct = a.globalUnlockedPercent ?? Infinity;
      const bPct = b.globalUnlockedPercent ?? Infinity;
      return aPct - bPct;
    });

  const unlockedCount = items.filter((a) => a.unlocked).length;
  const isPlatinum = Boolean(userId) && unlockedCount === items.length;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
        {t("achievementsTitle")}{" "}
        <span className="text-sm font-normal text-muted-foreground">
          {unlockedCount}/{items.length}
        </span>
        {isPlatinum ? (
          <span
            title={t("platinumBadge")}
            className="flex items-center gap-1 rounded-full border border-slate-400/40 bg-slate-400/10 px-2 py-0.5 text-xs font-semibold text-slate-300"
          >
            <PlatinumIcon />
            {t("platinumBadge")}
          </span>
        ) : null}
      </h2>
      <AchievementsCarousel achievements={items} />
    </div>
  );
}
