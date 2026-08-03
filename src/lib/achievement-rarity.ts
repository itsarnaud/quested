// A TrueAchievements-style "rarity score": each unlocked achievement is
// worth more the rarer it is globally, instead of every achievement
// counting as one flat point. Achievements with no known global percent
// (not yet backfilled, or a source that doesn't report it) are skipped.
//
// Points per achievement = 100 / percent, so a 100%-unlock-rate achievement
// is worth 1 point and a 1%-unlock-rate one is worth 100. The percent is
// floored at 0.5 so a near-0% outlier can't blow up a single achievement's
// weight disproportionately.
const MIN_PERCENT = 0.5;

export const pointsForAchievement = (globalUnlockedPercent: number | null): number => {
  if (globalUnlockedPercent == null) return 0;
  return 100 / Math.max(globalUnlockedPercent, MIN_PERCENT);
};

export const computeRarityScore = (globalUnlockedPercents: (number | null)[]): number => {
  const total = globalUnlockedPercents.reduce<number>((sum, percent) => sum + pointsForAchievement(percent), 0);
  return Math.round(total);
};
