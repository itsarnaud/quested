import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { callerAs } from "@/server/api/routers/__tests__/test-helpers";

const PREFIX = "vitest-follow-";

async function cleanup() {
  const users = await prisma.user.findMany({ where: { username: { startsWith: PREFIX } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.follow.deleteMany({ where: { OR: [{ followerId: { in: ids } }, { followingId: { in: ids } }] } });
  await prisma.user.deleteMany({ where: { username: { startsWith: PREFIX } } });
}

describe("follow router", () => {
  const aliceUsername = `${PREFIX}alice`;
  const bobUsername = `${PREFIX}bob`;
  let alice: { id: string };
  let bob: { id: string };

  beforeAll(async () => {
    await cleanup();
    alice = await prisma.user.create({
      data: { username: aliceUsername, name: "Alice", email: `${aliceUsername}@test.local` },
    });
    bob = await prisma.user.create({
      data: { username: bobUsername, name: "Bob", email: `${bobUsername}@test.local` },
    });
  });

  afterAll(cleanup);

  it("follows, then unfollows on a second toggle", async () => {
    const caller = callerAs(alice);

    const first = await caller.follow.toggle({ username: bobUsername });
    expect(first.following).toBe(true);

    const status = await caller.follow.status({ username: bobUsername });
    expect(status.isFollowing).toBe(true);
    expect(status.followerCount).toBe(1);

    const second = await caller.follow.toggle({ username: bobUsername });
    expect(second.following).toBe(false);

    const statusAfter = await caller.follow.status({ username: bobUsername });
    expect(statusAfter.isFollowing).toBe(false);
    expect(statusAfter.followerCount).toBe(0);
  });

  it("creates a FOLLOW notification for the target", async () => {
    const caller = callerAs(alice);
    await caller.follow.toggle({ username: bobUsername });

    const notification = await prisma.notification.findFirst({
      where: { userId: bob.id, actorId: alice.id, type: "FOLLOW" },
    });
    expect(notification).not.toBeNull();

    // leave state clean for other tests in this file
    await caller.follow.toggle({ username: bobUsername });
  });

  it("rejects following yourself", async () => {
    const caller = callerAs(alice);
    await expect(caller.follow.toggle({ username: aliceUsername })).rejects.toThrow();
  });

  it("rejects following a username that doesn't exist", async () => {
    const caller = callerAs(alice);
    await expect(caller.follow.toggle({ username: `${PREFIX}ghost` })).rejects.toThrow();
  });

  it("requires auth", async () => {
    const caller = callerAs(null);
    await expect(caller.follow.toggle({ username: bobUsername })).rejects.toThrow();
  });
});
