import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { syncAchievementsForGame, syncAchievementsPage } from "@/server/steam/achievements";
import type { SteamAchievementSchema, SteamPlayerAchievement } from "@/lib/steam-auth";

const { getSteamGameSchema, getSteamGlobalAchievementPercentages, getSteamPlayerAchievements } = vi.hoisted(() => ({
  getSteamGameSchema: vi.fn(async (): Promise<SteamAchievementSchema[]> => []),
  getSteamGlobalAchievementPercentages: vi.fn(async () => new Map<string, number>()),
  getSteamPlayerAchievements: vi.fn(async (): Promise<SteamPlayerAchievement[]> => []),
}));

vi.mock("@/lib/steam-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/steam-auth")>();
  return { ...actual, getSteamGameSchema, getSteamGlobalAchievementPercentages, getSteamPlayerAchievements };
});

const PREFIX = "vitest-steam-ach-";
const TITLE_PREFIX = "Vitest Steam Ach";

async function cleanup() {
  const users = await prisma.user.findMany({ where: { username: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.userAchievement.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.log.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.account.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { username: { startsWith: PREFIX } } });
  await prisma.game.deleteMany({ where: { title: { startsWith: TITLE_PREFIX } } });
}

describe("syncAchievementsForGame", () => {
  beforeEach(async () => {
    await cleanup();
    getSteamGameSchema.mockReset().mockResolvedValue([]);
    getSteamGlobalAchievementPercentages.mockReset().mockResolvedValue(new Map());
    getSteamPlayerAchievements.mockReset().mockResolvedValue([]);
  });

  afterAll(cleanup);

  it("fetches and stores the schema once, then only refreshes unlock state on later calls", async () => {
    const user = await prisma.user.create({ data: { username: `${PREFIX}u1`, email: `${PREFIX}u1@test.local` } });
    const game = await prisma.game.create({
      data: { slug: `${PREFIX}game-1`, title: `${TITLE_PREFIX} Game 1`, genres: [], platforms: [], developers: [] },
    });

    getSteamGameSchema.mockResolvedValue([
      { apiName: "ACH_1", displayName: "First Blood", description: "Do the thing", iconUrl: "u1", iconGrayUrl: "g1" },
    ]);
    getSteamGlobalAchievementPercentages.mockResolvedValue(new Map([["ACH_1", 12.5]]));
    getSteamPlayerAchievements.mockResolvedValue([
      { apiName: "ACH_1", achieved: true, unlockedAt: new Date("2024-01-01") },
    ]);

    const unlocked = await syncAchievementsForGame(user.id, "76500000000000001", game.id, "123");
    expect(unlocked).toBe(1);

    const achievements = await prisma.achievement.findMany({ where: { gameId: game.id } });
    expect(achievements).toHaveLength(1);
    expect(achievements[0].globalUnlockedPercent).toBe(12.5);

    const userAchievements = await prisma.userAchievement.findMany({ where: { userId: user.id } });
    expect(userAchievements).toHaveLength(1);

    getSteamGameSchema.mockClear();
    getSteamGlobalAchievementPercentages.mockClear();
    await syncAchievementsForGame(user.id, "76500000000000001", game.id, "123");

    expect(getSteamGameSchema).not.toHaveBeenCalled();
    expect(getSteamGlobalAchievementPercentages).not.toHaveBeenCalled();
  });

  it("only creates UserAchievement rows for achieved entries", async () => {
    const user = await prisma.user.create({ data: { username: `${PREFIX}u2`, email: `${PREFIX}u2@test.local` } });
    const game = await prisma.game.create({
      data: { slug: `${PREFIX}game-2`, title: `${TITLE_PREFIX} Game 2`, genres: [], platforms: [], developers: [] },
    });

    getSteamGameSchema.mockResolvedValue([
      { apiName: "A", displayName: "A", description: null, iconUrl: "u", iconGrayUrl: "g" },
      { apiName: "B", displayName: "B", description: null, iconUrl: "u", iconGrayUrl: "g" },
    ]);
    getSteamPlayerAchievements.mockResolvedValue([
      { apiName: "A", achieved: true, unlockedAt: null },
      { apiName: "B", achieved: false, unlockedAt: null },
    ]);

    const unlocked = await syncAchievementsForGame(user.id, "765", game.id, "456");
    expect(unlocked).toBe(1);

    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true },
    });
    expect(userAchievements).toHaveLength(1);
    expect(userAchievements[0].achievement.apiName).toBe("A");
  });

  it("does nothing for a game with no Steam achievement schema", async () => {
    const user = await prisma.user.create({ data: { username: `${PREFIX}u3`, email: `${PREFIX}u3@test.local` } });
    const game = await prisma.game.create({
      data: { slug: `${PREFIX}game-3`, title: `${TITLE_PREFIX} Game 3`, genres: [], platforms: [], developers: [] },
    });

    const unlocked = await syncAchievementsForGame(user.id, "765", game.id, "789");
    expect(unlocked).toBe(0);
    expect(getSteamPlayerAchievements).not.toHaveBeenCalled();
  });
});

describe("syncAchievementsPage", () => {
  beforeEach(async () => {
    await cleanup();
    getSteamGameSchema.mockReset().mockResolvedValue([]);
    getSteamGlobalAchievementPercentages.mockReset().mockResolvedValue(new Map());
    getSteamPlayerAchievements.mockReset().mockResolvedValue([]);
  });

  afterAll(cleanup);

  it("only processes the user's Steam-linked games", async () => {
    const user = await prisma.user.create({ data: { username: `${PREFIX}u4`, email: `${PREFIX}u4@test.local` } });
    await prisma.account.create({
      data: { userId: user.id, type: "oauth", provider: "steam", providerAccountId: "765111" },
    });

    const steamGame = await prisma.game.create({
      data: {
        slug: `${PREFIX}game-steam`,
        title: `${TITLE_PREFIX} Steam Game`,
        genres: [],
        platforms: [],
        developers: [],
        externalIds: { create: { source: "STEAM", sourceId: "999" } },
      },
    });
    const nonSteamGame = await prisma.game.create({
      data: { slug: `${PREFIX}game-igdb`, title: `${TITLE_PREFIX} IGDB Game`, genres: [], platforms: [], developers: [] },
    });
    await prisma.log.create({ data: { userId: user.id, gameId: steamGame.id, status: "PLAYING" } });
    await prisma.log.create({ data: { userId: user.id, gameId: nonSteamGame.id, status: "PLAYING" } });

    const result = await syncAchievementsPage(user.id, 0, 40);
    expect(result.gamesProcessed).toBe(1);
    expect(result.done).toBe(true);
  });

  it("paginates across multiple Steam-linked games", async () => {
    const user = await prisma.user.create({ data: { username: `${PREFIX}u5`, email: `${PREFIX}u5@test.local` } });
    await prisma.account.create({
      data: { userId: user.id, type: "oauth", provider: "steam", providerAccountId: "765222" },
    });

    for (let i = 0; i < 3; i++) {
      const game = await prisma.game.create({
        data: {
          slug: `${PREFIX}page-game-${i}`,
          title: `${TITLE_PREFIX} Page Game ${i}`,
          genres: [],
          platforms: [],
          developers: [],
          externalIds: { create: { source: "STEAM", sourceId: `${1000 + i}` } },
        },
      });
      await prisma.log.create({ data: { userId: user.id, gameId: game.id, status: "PLAYING" } });
    }

    const firstPage = await syncAchievementsPage(user.id, 0, 2);
    expect(firstPage.gamesProcessed).toBe(2);
    expect(firstPage.done).toBe(false);

    const secondPage = await syncAchievementsPage(user.id, 2, 2);
    expect(secondPage.gamesProcessed).toBe(1);
    expect(secondPage.done).toBe(true);
  });
});
