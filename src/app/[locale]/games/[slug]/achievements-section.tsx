import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { AchievementsCarousel } from "@/app/[locale]/games/[slug]/achievements-carousel";
import { PlatinumIcon } from "@/components/icons/platinum-icon";
import { SteamIcon } from "@/components/icons/steam-icon";
import { PsnIcon } from "@/components/icons/psn-icon";
import { XboxIcon } from "@/components/icons/xbox-icon";

const SOURCES = ["STEAM", "PSN", "XBOX"] as const;
type Source = (typeof SOURCES)[number];

export async function AchievementsSection({ gameId, userId }: { gameId: string; userId?: string }) {
  const achievements = await prisma.achievement.findMany({
    where: { gameId },
    include: { unlockedBy: { where: { userId: userId ?? "" } } },
    orderBy: { displayName: "asc" },
  });
  if (achievements.length === 0) return null;

  const t = await getTranslations("GamePage");
  const SOURCE_META: Record<Source, { label: string; Icon: typeof SteamIcon }> = {
    STEAM: { label: t("steamAchievementsLabel"), Icon: SteamIcon },
    PSN: { label: t("psnTrophiesLabel"), Icon: PsnIcon },
    XBOX: { label: t("xboxAchievementsLabel"), Icon: XboxIcon },
  };

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

  // A game can be linked to several sources at once (Steam+PSN, Steam+Xbox,
  // all three...) sharing this page — grouped and labeled separately below
  // so they don't read as duplicates of each other (they aren't: different
  // sources, different unlock states).
  const bySource = Object.fromEntries(SOURCES.map((s) => [s, items.filter((a) => a.source === s)])) as Record<
    Source,
    typeof items
  >;
  const presentSources = SOURCES.filter((s) => bySource[s].length > 0);
  const unlockedCount = items.filter((a) => a.unlocked).length;

  // "Platinum" here means 100%'d on at least one linked platform — a real
  // PSN Platinum trophy unlocked, or every achievement unlocked on a source
  // with no equivalent single trophy (Steam, Xbox). Checked per source
  // rather than requiring the combined list at 100%, since a game linked to
  // several platforms rarely finishes identically on each.
  const psnPlatinumAchievement = bySource.PSN.find((a) => a.isPlatinum);
  const psnPlatinum = psnPlatinumAchievement
    ? psnPlatinumAchievement.unlocked
    : bySource.PSN.length > 0 && bySource.PSN.every((a) => a.unlocked);
  const steamPlatinum = bySource.STEAM.length > 0 && bySource.STEAM.every((a) => a.unlocked);
  const xboxPlatinum = bySource.XBOX.length > 0 && bySource.XBOX.every((a) => a.unlocked);
  const isPlatinum = Boolean(userId) && (psnPlatinum || steamPlatinum || xboxPlatinum);

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

      {presentSources.length > 1 ? (
        presentSources.map((source) => {
          const { label, Icon } = SOURCE_META[source];
          const sourceItems = bySource[source];
          return (
            <div key={source} className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Icon width={16} height={16} />
                {label}
                <span className="font-normal">
                  {sourceItems.filter((a) => a.unlocked).length}/{sourceItems.length}
                </span>
              </h3>
              <AchievementsCarousel achievements={sourceItems} />
            </div>
          );
        })
      ) : (
        <AchievementsCarousel achievements={items} />
      )}
    </div>
  );
}
