import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { AchievementsCarousel } from "@/app/[locale]/games/[slug]/achievements-carousel";
import { PlatinumIcon } from "@/components/icons/platinum-icon";
import { SteamIcon } from "@/components/icons/steam-icon";
import { PsnIcon } from "@/components/icons/psn-icon";

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
      source: a.source,
      displayName: a.displayName,
      description: a.description,
      unlocked: a.unlockedBy.length > 0,
      iconUrl: a.unlockedBy.length > 0 ? a.iconUrl : a.iconGrayUrl,
      globalUnlockedPercent: a.globalUnlockedPercent,
      isPlatinum: a.isPlatinum,
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

  // A game linked to both Steam and PSN has two independent achievement
  // lists sharing this page — grouped and labeled separately below so they
  // don't read as duplicates of each other (they aren't: different sources,
  // different unlock states).
  const steamItems = items.filter((a) => a.source === "STEAM");
  const psnItems = items.filter((a) => a.source === "PSN");
  const unlockedCount = items.filter((a) => a.unlocked).length;

  // "Platinum" here means 100%'d on at least one platform — a real PSN
  // Platinum trophy unlocked, or every Steam achievement unlocked (Steam has
  // no equivalent single trophy). Checked per source rather than requiring
  // the combined list at 100%, since a game linked to both rarely gets
  // finished identically on each.
  const psnPlatinumAchievement = psnItems.find((a) => a.isPlatinum);
  const psnPlatinum = psnPlatinumAchievement
    ? psnPlatinumAchievement.unlocked
    : psnItems.length > 0 && psnItems.every((a) => a.unlocked);
  const steamPlatinum = steamItems.length > 0 && steamItems.every((a) => a.unlocked);
  const isPlatinum = Boolean(userId) && (psnPlatinum || steamPlatinum);

  return (
    <div className="flex flex-col gap-4">
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

      {steamItems.length > 0 && psnItems.length > 0 ? (
        <>
          <div className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <SteamIcon width={16} height={16} />
              {t("steamAchievementsLabel")}
              <span className="font-normal">
                {steamItems.filter((a) => a.unlocked).length}/{steamItems.length}
              </span>
            </h3>
            <AchievementsCarousel achievements={steamItems} />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <PsnIcon width={16} height={16} />
              {t("psnTrophiesLabel")}
              <span className="font-normal">
                {psnItems.filter((a) => a.unlocked).length}/{psnItems.length}
              </span>
            </h3>
            <AchievementsCarousel achievements={psnItems} />
          </div>
        </>
      ) : (
        <AchievementsCarousel achievements={items} />
      )}
    </div>
  );
}
