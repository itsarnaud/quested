import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { callerAs } from "@/server/api/routers/__tests__/test-helpers";

const PREFIX = "vitest-user-";

async function cleanup() {
  const users = await prisma.user.findMany({ where: { username: { startsWith: PREFIX } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  await prisma.log.deleteMany({ where: { userId: { in: ids } } });
  await prisma.follow.deleteMany({ where: { OR: [{ followerId: { in: ids } }, { followingId: { in: ids } }] } });
  await prisma.user.deleteMany({ where: { username: { startsWith: PREFIX } } });
  await prisma.game.deleteMany({ where: { slug: { startsWith: PREFIX } } });
}

describe("user router", () => {
  let searcher: { id: string };
  let target: { id: string };

  beforeAll(async () => {
    await cleanup();
    searcher = await prisma.user.create({
      data: { username: `${PREFIX}searcher`, name: "Searcher", email: `${PREFIX}searcher@test.local` },
    });
    target = await prisma.user.create({
      data: {
        username: `${PREFIX}findme`,
        name: "Find Me",
        badges: ["BUG_HUNTER"],
        email: `${PREFIX}findme@test.local`,
      },
    });
    const game = await prisma.game.create({
      data: { slug: `${PREFIX}game`, title: "Test Game", platforms: [], developers: [], genres: [] },
    });
    await prisma.log.create({
      data: { userId: target.id, gameId: game.id, status: "COMPLETED", notes: "Test review." },
    });
  });

  afterAll(cleanup);

  it("finds a user by username substring", async () => {
    const results = await callerAs(searcher).user.search({ query: "findme" });
    expect(results.some((u) => u.id === target.id)).toBe(true);
  });

  it("finds a user by name substring, case-insensitive", async () => {
    const results = await callerAs(searcher).user.search({ query: "find me" });
    expect(results.some((u) => u.id === target.id)).toBe(true);
  });

  it("excludes the current viewer from their own search results", async () => {
    const results = await callerAs(searcher).user.search({ query: PREFIX });
    expect(results.some((u) => u.id === searcher.id)).toBe(false);
  });

  it("includes badges and completed/review stats on search results", async () => {
    const results = await callerAs(searcher).user.search({ query: "findme" });
    const found = results.find((u) => u.id === target.id);
    expect(found?.badges).toContain("BUG_HUNTER");
    expect(found?.completedCount).toBe(1);
    expect(found?.reviewCount).toBe(1);
  });
});

const PIN_PREFIX = "vitest-pin-";

async function cleanupPinned() {
  const users = await prisma.user.findMany({ where: { username: { startsWith: PIN_PREFIX } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  await prisma.pinnedAchievement.deleteMany({ where: { userId: { in: ids } } });
  await prisma.userAchievement.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { username: { startsWith: PIN_PREFIX } } });
  await prisma.game.deleteMany({ where: { slug: { startsWith: PIN_PREFIX } } });
}

describe("pinned achievements", () => {
  let user: { id: string };
  let unlockedAchievements: { id: string }[];
  let lockedAchievement: { id: string };

  beforeAll(async () => {
    await cleanupPinned();
    user = await prisma.user.create({
      data: { username: `${PIN_PREFIX}user`, email: `${PIN_PREFIX}user@test.local` },
    });
    const game = await prisma.game.create({
      data: { slug: `${PIN_PREFIX}game`, title: "Pin Test Game", platforms: [], developers: [], genres: [] },
    });
    const achievements = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        prisma.achievement.create({
          data: { gameId: game.id, apiName: `ACH_${i}`, displayName: `Achievement ${i}`, iconUrl: "u", iconGrayUrl: "g" },
        }),
      ),
    );
    lockedAchievement = achievements[5];
    unlockedAchievements = achievements.slice(0, 5);
    await prisma.userAchievement.createMany({
      data: unlockedAchievements.map((a) => ({ userId: user.id, achievementId: a.id })),
    });
  });

  afterAll(cleanupPinned);

  it("pins an unlocked achievement", async () => {
    const result = await callerAs(user).user.setPinnedAchievements({
      achievementIds: [unlockedAchievements[0].id],
    });
    expect(result.success).toBe(true);

    const pinned = await callerAs(user).user.getPinnedAchievements();
    expect(pinned).toHaveLength(1);
    expect(pinned[0].id).toBe(unlockedAchievements[0].id);
  });

  it("rejects pinning an achievement the user hasn't unlocked", async () => {
    await expect(
      callerAs(user).user.setPinnedAchievements({ achievementIds: [lockedAchievement.id] }),
    ).rejects.toThrow();
  });

  it("enforces a maximum of 4 pinned achievements", async () => {
    const fiveIds = unlockedAchievements.map((a) => a.id);
    expect(fiveIds).toHaveLength(5);
    await expect(callerAs(user).user.setPinnedAchievements({ achievementIds: fiveIds })).rejects.toThrow();
  });

  it("preserves pick order as position", async () => {
    const ids = [unlockedAchievements[2].id, unlockedAchievements[0].id, unlockedAchievements[1].id];
    await callerAs(user).user.setPinnedAchievements({ achievementIds: ids });

    const pinned = await callerAs(user).user.getPinnedAchievements();
    expect(pinned.map((p) => p.id)).toEqual(ids);
  });

  it("unpinning removes the achievement", async () => {
    await callerAs(user).user.setPinnedAchievements({ achievementIds: [unlockedAchievements[0].id] });
    await callerAs(user).user.setPinnedAchievements({ achievementIds: [] });

    const pinned = await callerAs(user).user.getPinnedAchievements();
    expect(pinned).toHaveLength(0);
  });

  it("getUnlockedAchievements only returns the user's own unlocked achievements", async () => {
    const unlocked = await callerAs(user).user.getUnlockedAchievements();
    expect(unlocked).toHaveLength(5);
    expect(unlocked.some((a) => a.id === lockedAchievement.id)).toBe(false);
  });
});
