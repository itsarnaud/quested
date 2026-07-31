import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { callerAs } from "@/server/api/routers/__tests__/test-helpers";

const PREFIX = "vitest-like-";

async function cleanup() {
  const users = await prisma.user.findMany({ where: { username: { startsWith: PREFIX } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.log.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { username: { startsWith: PREFIX } } });
  await prisma.game.deleteMany({ where: { slug: { startsWith: PREFIX } } });
}

describe("like router", () => {
  let author: { id: string };
  let liker: { id: string };
  let logId: string;

  beforeAll(async () => {
    await cleanup();
    author = await prisma.user.create({
      data: { username: `${PREFIX}author`, name: "Author", email: `${PREFIX}author@test.local` },
    });
    liker = await prisma.user.create({
      data: { username: `${PREFIX}liker`, name: "Liker", email: `${PREFIX}liker@test.local` },
    });
    const game = await prisma.game.create({
      data: { slug: `${PREFIX}game`, title: "Test Game", platforms: [], developers: [], genres: [] },
    });
    const log = await prisma.log.create({
      data: { userId: author.id, gameId: game.id, status: "COMPLETED", notes: "A review." },
    });
    logId = log.id;
  });

  afterAll(cleanup);

  it("likes, then unlikes on a second toggle", async () => {
    const first = await callerAs(liker).like.toggle({ logId });
    expect(first.liked).toBe(true);

    const second = await callerAs(liker).like.toggle({ logId });
    expect(second.liked).toBe(false);
  });

  it("creates a LIKE notification for the review author", async () => {
    await callerAs(liker).like.toggle({ logId });
    const notification = await prisma.notification.findFirst({
      where: { userId: author.id, actorId: liker.id, type: "LIKE", logId },
    });
    expect(notification).not.toBeNull();
    await callerAs(liker).like.toggle({ logId }); // back to unliked
  });

  it("rejects liking your own review", async () => {
    await expect(callerAs(author).like.toggle({ logId })).rejects.toThrow();
  });

  it("rejects liking a log that doesn't exist", async () => {
    await expect(callerAs(liker).like.toggle({ logId: "not-a-real-id" })).rejects.toThrow();
  });

  it("requires auth", async () => {
    await expect(callerAs(null).like.toggle({ logId })).rejects.toThrow();
  });
});
