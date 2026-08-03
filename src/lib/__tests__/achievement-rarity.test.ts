import { describe, expect, it } from "vitest";
import { computeRarityScore, pointsForAchievement } from "@/lib/achievement-rarity";

describe("pointsForAchievement", () => {
  it("gives 1 point for a 100%-unlock-rate achievement", () => {
    expect(pointsForAchievement(100)).toBe(1);
  });

  it("gives more points the rarer the achievement", () => {
    expect(pointsForAchievement(10)).toBeGreaterThan(pointsForAchievement(50));
  });

  it("caps out at the minimum percent floor instead of blowing up near 0", () => {
    expect(pointsForAchievement(0.01)).toBe(pointsForAchievement(0.5));
  });

  it("returns 0 when the global percent is unknown", () => {
    expect(pointsForAchievement(null)).toBe(0);
  });
});

describe("computeRarityScore", () => {
  it("sums points across achievements and rounds the total", () => {
    const score = computeRarityScore([100, 50, 25]);
    expect(score).toBe(Math.round(1 + 2 + 4));
  });

  it("ignores achievements with no known percent", () => {
    expect(computeRarityScore([100, null, null])).toBe(1);
  });

  it("returns 0 for an empty list", () => {
    expect(computeRarityScore([])).toBe(0);
  });
});
