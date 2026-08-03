import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ControllerIcon } from "@/components/icons/controller-icon";
import { ClockIcon } from "@/components/icons/clock-icon";
import { StarIcon } from "@/components/icons/star-icon";
import { TrophyIcon } from "@/components/icons/trophy-icon";
import { formatPlaytime } from "@/lib/format-playtime";

type StatusCounts = {
  COMPLETED: number;
  PLAYING: number;
  BACKLOG: number;
  WISHLIST: number;
  DROPPED: number;
};

type MostPlayedGame = { slug: string; title: string; coverUrl: string | null; minutesPlayed: number };
type TopGenre = { name: string; count: number };
type LatestAchievement = { displayName: string; iconUrl: string; gameSlug: string; gameTitle: string };

// Completed/succeeded stats get the accent color, active states get a
// secondary blue, everything else stays neutral — deliberately limited
// palette instead of one color per status.
const STATUS_STYLE: Record<keyof StatusCounts, string> = {
  COMPLETED: "#7c8cff",
  PLAYING: "#38bdf8",
  BACKLOG: "#71717a",
  WISHLIST: "#71717a",
  DROPPED: "#71717a",
};
const STATUS_ORDER: (keyof StatusCounts)[] = ["COMPLETED", "PLAYING", "BACKLOG", "WISHLIST", "DROPPED"];

// A plain KPI, no card/border — the numbers and generous grid gaps do the
// structuring, so it reads as part of the page rather than a boxed widget.
function Kpi({
  icon,
  value,
  label,
  subtitle,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-muted-foreground/60">{icon}</div>
      <span className="text-4xl font-extrabold tracking-tight">{value}</span>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">{label}</span>
        {subtitle ? <span className="text-xs text-muted-foreground">{subtitle}</span> : null}
      </div>
    </div>
  );
}

function StatusBar({ counts, t }: { counts: StatusCounts; t: (key: string) => string }) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-border/50">
        {STATUS_ORDER.filter((key) => counts[key] > 0).map((key) => (
          <div
            key={key}
            title={`${t(key)} : ${counts[key]}`}
            style={{
              width: `${(counts[key] / total) * 100}%`,
              // Wishlist gets an outline instead of a fill — same neutral
              // family as Backlog, but shape alone tells them apart even
              // without the legend below.
              backgroundColor: key === "WISHLIST" ? "transparent" : STATUS_STYLE[key],
              boxShadow: key === "WISHLIST" ? `inset 0 0 0 1.5px ${STATUS_STYLE[key]}` : undefined,
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {STATUS_ORDER.filter((key) => counts[key] > 0).map((key) => (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <span
              className="size-2 shrink-0 rounded-full"
              style={
                key === "WISHLIST"
                  ? { boxShadow: `inset 0 0 0 1.5px ${STATUS_STYLE[key]}` }
                  : { backgroundColor: STATUS_STYLE[key] }
              }
            />
            <span className="text-muted-foreground">{t(key)}</span>
            <span className="font-semibold">{counts[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// The meta trio is the one place that keeps a light card treatment — these
// are genuinely distinct "objects" (a game, a genre, an achievement), unlike
// the KPIs/progress above which are just numbers about the same dataset.
function MetaCard({
  href,
  icon,
  label,
  value,
  subtitle,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
}) {
  const content = (
    <>
      {icon}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">{label}</span>
        <span className="truncate text-sm font-semibold">
          {value}
          {subtitle ? <span className="font-normal text-muted-foreground"> · {subtitle}</span> : null}
        </span>
      </div>
    </>
  );
  const className =
    "flex items-center gap-3 rounded-full border border-border py-2 pl-2 pr-4 transition-colors";

  return href ? (
    <Link href={href} prefetch={false} className={`${className} hover:bg-muted`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export async function ProfileStats({
  totalGames,
  totalMinutesPlayed,
  averageRating,
  unlockedAchievementsCount,
  totalAchievementsForTrackedGames,
  statusCounts,
  completedThisYear,
  mostPlayedGame,
  topGenre,
  latestAchievement,
  reviewsCount,
  listsCount,
}: {
  totalGames: number;
  totalMinutesPlayed: number;
  averageRating: number | null;
  unlockedAchievementsCount: number;
  totalAchievementsForTrackedGames: number;
  statusCounts: StatusCounts;
  completedThisYear: number;
  mostPlayedGame: MostPlayedGame | null;
  topGenre: TopGenre | null;
  latestAchievement: LatestAchievement | null;
  reviewsCount: number;
  listsCount: number;
}) {
  const t = await getTranslations("Profile");
  const tStatus = await getTranslations("GameStatus");

  const hasMeta = mostPlayedGame || topGenre || latestAchievement;
  const playedDays = Math.round(totalMinutesPlayed / 60 / 24);

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("statsTitle")}</h2>

      <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
        <div>
          <Kpi icon={<ControllerIcon />} value={totalGames} label={t("statsTotalGames")} />
        </div>
        <div className="sm:border-l sm:border-border sm:pl-6">
          <Kpi
            icon={<ClockIcon />}
            value={totalMinutesPlayed > 0 ? formatPlaytime(totalMinutesPlayed) : "—"}
            label={t("statsPlaytime")}
            subtitle={playedDays > 0 ? t("playedDaysSubtitle", { days: playedDays }) : undefined}
          />
        </div>
        <div className="sm:border-l sm:border-border sm:pl-6">
          <Kpi
            icon={<StarIcon />}
            value={averageRating != null ? averageRating.toFixed(1) : "—"}
            label={t("statsAvgRating")}
          />
        </div>
        <div className="sm:border-l sm:border-border sm:pl-6">
          <Kpi
            icon={<TrophyIcon />}
            value={unlockedAchievementsCount}
            label={t("statsAchievements")}
            subtitle={
              totalAchievementsForTrackedGames > 0
                ? t("achievementsSubtitle", { total: totalAchievementsForTrackedGames })
                : undefined
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("progressionLabel")}
          </h3>
          {completedThisYear > 0 ? (
            <span className="text-xs text-accent">
              {t("statsPlayedThisYear")} · {completedThisYear}
            </span>
          ) : null}
        </div>
        <StatusBar counts={statusCounts} t={(key) => tStatus(key as never)} />
      </div>

      {hasMeta ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {mostPlayedGame ? (
            <MetaCard
              href={`/games/${mostPlayedGame.slug}`}
              label={t("mostPlayedGameLabel")}
              value={mostPlayedGame.title}
              subtitle={formatPlaytime(mostPlayedGame.minutesPlayed)}
              icon={
                <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-muted">
                  {mostPlayedGame.coverUrl ? (
                    <Image src={mostPlayedGame.coverUrl} alt="" fill unoptimized className="object-cover" />
                  ) : null}
                </div>
              }
            />
          ) : null}

          {topGenre ? (
            <MetaCard
              label={t("topGenreLabel")}
              value={topGenre.name}
              subtitle={t("topGenreCount", { count: topGenre.count })}
              icon={
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <ControllerIcon width={18} height={18} />
                </div>
              }
            />
          ) : null}

          {latestAchievement ? (
            <MetaCard
              href={`/games/${latestAchievement.gameSlug}`}
              label={t("latestAchievementLabel")}
              value={latestAchievement.displayName}
              subtitle={latestAchievement.gameTitle}
              icon={
                <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-muted">
                  <Image src={latestAchievement.iconUrl} alt="" fill unoptimized className="object-cover" />
                </div>
              }
            />
          ) : null}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {t("statsReviews")} · {reviewsCount} · {t("statsLists")} · {listsCount}
      </p>
    </div>
  );
}
