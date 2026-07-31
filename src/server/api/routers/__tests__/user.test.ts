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
