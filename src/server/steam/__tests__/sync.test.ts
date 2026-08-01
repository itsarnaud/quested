import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { syncSteamLibraryPage } from "@/server/steam/sync";
import type { IgdbGame } from "@/server/igdb/client";

const { resolveIgdbIdsBySteamAppIds, getIgdbGamesByIds } = vi.hoisted(() => ({
  resolveIgdbIdsBySteamAppIds: vi.fn(async () => new Map<string, number>()),
  getIgdbGamesByIds: vi.fn(async () => [] as IgdbGame[]),
}));

vi.mock("@/server/igdb/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/igdb/client")>();
  return { ...actual, resolveIgdbIdsBySteamAppIds, getIgdbGamesByIds };
});

// Test Steam appids live in a high, dedicated range so they can't collide
// with real data — cleanup matches on the "Vitest Steam" title prefix
// instead, since sourceId here is just a stringified number.
const PREFIX = "vitest-steam-sync-";
const TITLE_PREFIX = "Vitest Steam";
let nextAppId = 900_000_000;

async function cleanup() {
  const users = await prisma.user.findMany({ where: { username: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.log.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { username: { startsWith: PREFIX } } });
  await prisma.game.deleteMany({ where: { title: { startsWith: TITLE_PREFIX } } });
}

describe("syncSteamLibraryPage", () => {
  beforeEach(async () => {
    await cleanup();
    resolveIgdbIdsBySteamAppIds.mockReset().mockResolvedValue(new Map());
    getIgdbGamesByIds.mockReset().mockResolvedValue([]);
  });

  afterAll(cleanup);

  it("creates a bare Game + STEAM external id when IGDB has no match", async () => {
    const user = await prisma.user.create({ data: { username: `${PREFIX}u1`, email: `${PREFIX}u1@test.local` } });
    const appid = nextAppId++;

    const result = await syncSteamLibraryPage(
      user.id,
      [{ appid, name: `${TITLE_PREFIX} Unmatched App`, playtimeMinutes: 0 }],
      0,
      40,
    );

    expect(result.imported).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.done).toBe(true);

    const link = await prisma.gameExternalId.findUnique({
      where: { source_sourceId: { source: "STEAM", sourceId: String(appid) } },
      include: { game: true },
    });
    expect(link?.game.title).toBe(`${TITLE_PREFIX} Unmatched App`);

    const log = await prisma.log.findUnique({ where: { userId_gameId: { userId: user.id, gameId: link!.gameId } } });
    expect(log?.status).toBe("BACKLOG");
  });

  it("sets status to PLAYING when playtime is greater than 0", async () => {
    const user = await prisma.user.create({ data: { username: `${PREFIX}u2`, email: `${PREFIX}u2@test.local` } });
    const appid = nextAppId++;

    await syncSteamLibraryPage(user.id, [{ appid, name: `${TITLE_PREFIX} Played App`, playtimeMinutes: 120 }], 0, 40);

    const link = await prisma.gameExternalId.findUnique({
      where: { source_sourceId: { source: "STEAM", sourceId: String(appid) } },
    });
    const log = await prisma.log.findUnique({ where: { userId_gameId: { userId: user.id, gameId: link!.gameId } } });
    expect(log?.status).toBe("PLAYING");
    expect(log?.minutesPlayed).toBe(120);
  });

  it("links via IGDB match when resolveIgdbIdsBySteamAppIds finds one", async () => {
    const user = await prisma.user.create({ data: { username: `${PREFIX}u3`, email: `${PREFIX}u3@test.local` } });
    const appid = nextAppId++;

    resolveIgdbIdsBySteamAppIds.mockResolvedValue(new Map([[String(appid), 999]]));
    getIgdbGamesByIds.mockResolvedValue([{ id: 999, name: `${TITLE_PREFIX} IGDB Matched Game` }]);

    await syncSteamLibraryPage(user.id, [{ appid, name: "Steam Name", playtimeMinutes: 30 }], 0, 40);

    const game = await prisma.game.findFirst({
      where: { title: `${TITLE_PREFIX} IGDB Matched Game` },
      include: { externalIds: true },
    });
    expect(game).not.toBeNull();
    const sources = game!.externalIds.map((e) => e.source).sort();
    expect(sources).toEqual(["IGDB", "STEAM"]);
  });

  it("does not overwrite an existing log's status/rating, but does refresh minutesPlayed", async () => {
    const user = await prisma.user.create({ data: { username: `${PREFIX}u4`, email: `${PREFIX}u4@test.local` } });
    const appid = nextAppId++;

    await syncSteamLibraryPage(user.id, [{ appid, name: `${TITLE_PREFIX} Manual Game`, playtimeMinutes: 10 }], 0, 40);
    const link = await prisma.gameExternalId.findUnique({
      where: { source_sourceId: { source: "STEAM", sourceId: String(appid) } },
    });
    await prisma.log.update({
      where: { userId_gameId: { userId: user.id, gameId: link!.gameId } },
      data: { status: "COMPLETED", rating: 9 },
    });

    const result = await syncSteamLibraryPage(
      user.id,
      [{ appid, name: `${TITLE_PREFIX} Manual Game`, playtimeMinutes: 50 }],
      0,
      40,
    );

    expect(result.updated).toBe(1);
    expect(result.imported).toBe(0);
    const log = await prisma.log.findUnique({ where: { userId_gameId: { userId: user.id, gameId: link!.gameId } } });
    expect(log?.status).toBe("COMPLETED");
    expect(log?.rating).toBe(9);
    expect(log?.minutesPlayed).toBe(50);
  });

  it("skips IGDB resolution for appids already linked from a prior sync", async () => {
    const user = await prisma.user.create({ data: { username: `${PREFIX}u5`, email: `${PREFIX}u5@test.local` } });
    const appid = nextAppId++;

    await syncSteamLibraryPage(user.id, [{ appid, name: `${TITLE_PREFIX} Cached Game`, playtimeMinutes: 5 }], 0, 40);
    resolveIgdbIdsBySteamAppIds.mockClear();

    await syncSteamLibraryPage(user.id, [{ appid, name: `${TITLE_PREFIX} Cached Game`, playtimeMinutes: 15 }], 0, 40);

    expect(resolveIgdbIdsBySteamAppIds).toHaveBeenCalledWith([]);
  });

  it("computes done based on offset + limit vs. total library size", async () => {
    const user = await prisma.user.create({ data: { username: `${PREFIX}u6`, email: `${PREFIX}u6@test.local` } });
    const games = Array.from({ length: 5 }, (_, i) => ({
      appid: nextAppId++,
      name: `${TITLE_PREFIX} Page Game ${i}`,
      playtimeMinutes: 0,
    }));

    const firstPage = await syncSteamLibraryPage(user.id, games, 0, 3);
    expect(firstPage.done).toBe(false);

    const secondPage = await syncSteamLibraryPage(user.id, games, 3, 3);
    expect(secondPage.done).toBe(true);
  });
});
