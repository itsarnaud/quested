import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { callerAs } from "@/server/api/routers/__tests__/test-helpers";

const PREFIX = "vitest-log-";

async function cleanup() {
  const users = await prisma.user.findMany({ where: { username: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.log.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { username: { startsWith: PREFIX } } });
  await prisma.game.deleteMany({ where: { slug: { startsWith: PREFIX } } });
}

describe("log router", () => {
  let user: { id: string };
  let releasedGame: { id: string };
  let unreleasedGame: { id: string };

  beforeAll(async () => {
    await cleanup();
    user = await prisma.user.create({
      data: { username: `${PREFIX}user`, name: "User", email: `${PREFIX}user@test.local` },
    });
    releasedGame = await prisma.game.create({
      data: { slug: `${PREFIX}released`, title: "Released Game", releaseYear: 2020, platforms: [], developers: [], genres: [] },
    });
    unreleasedGame = await prisma.game.create({
      data: {
        slug: `${PREFIX}unreleased`,
        title: "Unreleased Game",
        releaseYear: new Date().getFullYear() + 1,
        platforms: [],
        developers: [],
        genres: [],
      },
    });
  });

  afterAll(cleanup);

  it("creates a log on first upsert", async () => {
    const log = await callerAs(user).log.upsert({ gameId: releasedGame.id, status: "PLAYING" });
    expect(log.status).toBe("PLAYING");
    expect(log.userId).toBe(user.id);
  });

  it("updates the same log on a second upsert instead of duplicating", async () => {
    await callerAs(user).log.upsert({ gameId: releasedGame.id, status: "COMPLETED", rating: 8.4 });
    const logs = await prisma.log.findMany({ where: { userId: user.id, gameId: releasedGame.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe("COMPLETED");
    expect(logs[0].rating).toBe(8.4);
  });

  it("rounds the rating to one decimal", async () => {
    const log = await callerAs(user).log.upsert({ gameId: releasedGame.id, status: "COMPLETED", rating: 7.777 });
    expect(log.rating).toBe(7.8);
  });

  it("rejects rating an unreleased game", async () => {
    await expect(
      callerAs(user).log.upsert({ gameId: unreleasedGame.id, status: "WISHLIST", rating: 9 }),
    ).rejects.toThrow();
  });

  it("allows logging an unreleased game without a rating", async () => {
    const log = await callerAs(user).log.upsert({ gameId: unreleasedGame.id, status: "WISHLIST" });
    expect(log.status).toBe("WISHLIST");
    expect(log.rating).toBeNull();
  });

  it("getForGame returns the viewer's own log", async () => {
    const log = await callerAs(user).log.getForGame({ gameId: releasedGame.id });
    expect(log?.status).toBe("COMPLETED");
  });

  it("listForUser includes the game relation", async () => {
    const logs = await callerAs(user).log.listForUser();
    expect(logs.some((l) => l.game.id === releasedGame.id)).toBe(true);
  });

  it("requires auth", async () => {
    await expect(callerAs(null).log.listForUser()).rejects.toThrow();
  });

  it("deletes a log", async () => {
    await callerAs(user).log.delete({ gameId: unreleasedGame.id });
    const log = await prisma.log.findUnique({
      where: { userId_gameId: { userId: user.id, gameId: unreleasedGame.id } },
    });
    expect(log).toBeNull();
  });

  it("delete requires auth", async () => {
    await expect(callerAs(null).log.delete({ gameId: releasedGame.id })).rejects.toThrow();
  });
});
