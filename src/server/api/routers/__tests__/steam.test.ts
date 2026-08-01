import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { callerAs } from "@/server/api/routers/__tests__/test-helpers";
import type { SteamOwnedGame } from "@/lib/steam-auth";

const { getSteamOwnedGames } = vi.hoisted(() => ({
  getSteamOwnedGames: vi.fn(async (): Promise<SteamOwnedGame[] | null> => []),
}));

vi.mock("@/lib/steam-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/steam-auth")>();
  return { ...actual, getSteamOwnedGames };
});

const PREFIX = "vitest-steam-router-";

async function cleanup() {
  const users = await prisma.user.findMany({ where: { username: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.log.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.account.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { username: { startsWith: PREFIX } } });
  await prisma.game.deleteMany({ where: { title: { startsWith: "Vitest Steam" } } });
}

describe("steam router", () => {
  beforeEach(async () => {
    await cleanup();
    getSteamOwnedGames.mockReset().mockResolvedValue([]);
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
});
