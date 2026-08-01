import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { callerAs } from "@/server/api/routers/__tests__/test-helpers";
import type { SteamOwnedGame, SteamAchievementSchema, SteamPlayerAchievement } from "@/lib/steam-auth";
import type { IgdbGame } from "@/server/igdb/client";

const { getSteamOwnedGames, getSteamGameSchema, getSteamGlobalAchievementPercentages, getSteamPlayerAchievements } =
  vi.hoisted(() => ({
    getSteamOwnedGames: vi.fn(async (): Promise<SteamOwnedGame[] | null> => []),
    getSteamGameSchema: vi.fn(async (): Promise<SteamAchievementSchema[]> => []),
    getSteamGlobalAchievementPercentages: vi.fn(async () => new Map<string, number>()),
    getSteamPlayerAchievements: vi.fn(async (): Promise<SteamPlayerAchievement[]> => []),
  }));

const { resolveIgdbIdsBySteamAppIds, getIgdbGamesByIds } = vi.hoisted(() => ({
  resolveIgdbIdsBySteamAppIds: vi.fn(async () => new Map<string, number>()),
  getIgdbGamesByIds: vi.fn(async () => [] as IgdbGame[]),
}));

vi.mock("@/lib/steam-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/steam-auth")>();
  return {
    ...actual,
    getSteamOwnedGames,
    getSteamGameSchema,
    getSteamGlobalAchievementPercentages,
    getSteamPlayerAchievements,
  };
});

// syncPage's library sync tries to resolve each unmatched appid against
// IGDB — mock it out so this file never depends on real IGDB credentials
// (CI has none), matching the pattern already used in sync.test.ts.
vi.mock("@/server/igdb/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/igdb/client")>();
  return { ...actual, resolveIgdbIdsBySteamAppIds, getIgdbGamesByIds };
});

const PREFIX = "vitest-steam-router-";

async function cleanup() {
  const users = await prisma.user.findMany({ where: { username: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.userAchievement.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.log.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.account.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { username: { startsWith: PREFIX } } });
  await prisma.game.deleteMany({ where: { title: { startsWith: "Vitest Steam" } } });
}

describe("steam router", () => {
  beforeEach(async () => {
    await cleanup();
    getSteamOwnedGames.mockReset().mockResolvedValue([]);
    getSteamGameSchema.mockReset().mockResolvedValue([]);
    getSteamGlobalAchievementPercentages.mockReset().mockResolvedValue(new Map());
    getSteamPlayerAchievements.mockReset().mockResolvedValue([]);
    resolveIgdbIdsBySteamAppIds.mockReset().mockResolvedValue(new Map());
    getIgdbGamesByIds.mockReset().mockResolvedValue([]);
  });

  afterAll(cleanup);

  it("requires auth", async () => {
    await expect(callerAs(null).steam.getLibrarySize()).rejects.toThrow();
    await expect(callerAs(null).steam.syncPage({ offset: 0, limit: 10 })).rejects.toThrow();
  });

  it("requires a linked Steam account", async () => {
    const user = await prisma.user.create({ data: { username: `${PREFIX}u1`, email: `${PREFIX}u1@test.local` } });
    await expect(callerAs(user).steam.getLibrarySize()).rejects.toThrow();
  });

  it("getLibrarySize reports isPrivate when Steam returns null", async () => {
    const user = await prisma.user.create({ data: { username: `${PREFIX}u2`, email: `${PREFIX}u2@test.local` } });
    await prisma.account.create({
      data: { userId: user.id, type: "oauth", provider: "steam", providerAccountId: "1" },
    });
    getSteamOwnedGames.mockResolvedValue(null);

    const result = await callerAs(user).steam.getLibrarySize();
    expect(result).toEqual({ total: 0, isPrivate: true });
  });

  it("getLibrarySize returns the owned games count for a public profile", async () => {
    const user = await prisma.user.create({ data: { username: `${PREFIX}u3`, email: `${PREFIX}u3@test.local` } });
    await prisma.account.create({
      data: { userId: user.id, type: "oauth", provider: "steam", providerAccountId: "2" },
    });
    getSteamOwnedGames.mockResolvedValue([
      { appid: 1, name: "Vitest Steam Game A", playtimeMinutes: 0 },
      { appid: 2, name: "Vitest Steam Game B", playtimeMinutes: 0 },
    ]);

    const result = await callerAs(user).steam.getLibrarySize();
    expect(result).toEqual({ total: 2, isPrivate: false });
  });

  it("syncPage imports games for the linked Steam account", async () => {
    const user = await prisma.user.create({ data: { username: `${PREFIX}u4`, email: `${PREFIX}u4@test.local` } });
    await prisma.account.create({
      data: { userId: user.id, type: "oauth", provider: "steam", providerAccountId: "3" },
    });
    getSteamOwnedGames.mockResolvedValue([{ appid: 999001, name: "Vitest Steam Synced Game", playtimeMinutes: 42 }]);

    const result = await callerAs(user).steam.syncPage({ offset: 0, limit: 40 });
    expect(result).toEqual({ imported: 1, updated: 0, done: true });

    const logs = await prisma.log.findMany({ where: { userId: user.id }, include: { game: true } });
    expect(logs).toHaveLength(1);
    expect(logs[0].game.title).toBe("Vitest Steam Synced Game");
    expect(logs[0].minutesPlayed).toBe(42);
  });

  it("syncPage rejects when the Steam profile is private", async () => {
    const user = await prisma.user.create({ data: { username: `${PREFIX}u5`, email: `${PREFIX}u5@test.local` } });
    await prisma.account.create({
      data: { userId: user.id, type: "oauth", provider: "steam", providerAccountId: "4" },
    });
    getSteamOwnedGames.mockResolvedValue(null);

    await expect(callerAs(user).steam.syncPage({ offset: 0, limit: 40 })).rejects.toThrow();
  });

  it("getTrackedGameCount only counts logs on Steam-linked games", async () => {
    const user = await prisma.user.create({ data: { username: `${PREFIX}u6`, email: `${PREFIX}u6@test.local` } });
    const steamGame = await prisma.game.create({
      data: {
        slug: `${PREFIX}tracked-steam`,
        title: "Vitest Steam Tracked Game",
        genres: [],
        platforms: [],
        developers: [],
        externalIds: { create: { source: "STEAM", sourceId: "5001" } },
      },
    });
    const otherGame = await prisma.game.create({
      data: { slug: `${PREFIX}tracked-other`, title: "Vitest Steam Other Game", genres: [], platforms: [], developers: [] },
    });
    await prisma.log.create({ data: { userId: user.id, gameId: steamGame.id, status: "PLAYING" } });
    await prisma.log.create({ data: { userId: user.id, gameId: otherGame.id, status: "PLAYING" } });

    const count = await callerAs(user).steam.getTrackedGameCount();
    expect(count).toBe(1);
  });

  it("syncAchievementsPage requires a linked Steam account", async () => {
    const user = await prisma.user.create({ data: { username: `${PREFIX}u7`, email: `${PREFIX}u7@test.local` } });
    await expect(callerAs(user).steam.syncAchievementsPage({ offset: 0, limit: 5 })).rejects.toThrow();
  });

  it("syncAchievementsPage syncs unlocked achievements for Steam-linked games", async () => {
    const user = await prisma.user.create({ data: { username: `${PREFIX}u8`, email: `${PREFIX}u8@test.local` } });
    await prisma.account.create({
      data: { userId: user.id, type: "oauth", provider: "steam", providerAccountId: "6001" },
    });
    const game = await prisma.game.create({
      data: {
        slug: `${PREFIX}ach-game`,
        title: "Vitest Steam Achievement Game",
        genres: [],
        platforms: [],
        developers: [],
        externalIds: { create: { source: "STEAM", sourceId: "7001" } },
      },
    });
    await prisma.log.create({ data: { userId: user.id, gameId: game.id, status: "PLAYING" } });

    getSteamGameSchema.mockResolvedValue([
      { apiName: "WIN", displayName: "Winner", description: null, iconUrl: "u", iconGrayUrl: "g" },
    ]);
    getSteamPlayerAchievements.mockResolvedValue([{ apiName: "WIN", achieved: true, unlockedAt: null }]);

    const result = await callerAs(user).steam.syncAchievementsPage({ offset: 0, limit: 5 });
    expect(result).toEqual({ gamesProcessed: 1, achievementsUnlocked: 1, done: true });
  });
});
