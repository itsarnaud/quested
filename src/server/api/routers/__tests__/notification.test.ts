import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { callerAs } from "@/server/api/routers/__tests__/test-helpers";

const PREFIX = "vitest-notif-";

async function cleanup() {
  const users = await prisma.user.findMany({ where: { username: { startsWith: PREFIX } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { username: { startsWith: PREFIX } } });
}

describe("notification router", () => {
  let me: { id: string };
  let actor: { id: string };

  beforeAll(async () => {
    await cleanup();
    me = await prisma.user.create({ data: { username: `${PREFIX}me`, name: "Me", email: `${PREFIX}me@test.local` } });
    actor = await prisma.user.create({
      data: { username: `${PREFIX}actor`, name: "Actor", email: `${PREFIX}actor@test.local` },
    });
    await prisma.notification.createMany({
      data: [
        { userId: me.id, actorId: actor.id, type: "FOLLOW", read: false },
        { userId: me.id, actorId: actor.id, type: "FOLLOW", read: true },
      ],
    });
  });

  afterAll(cleanup);

  it("list only returns unread notifications", async () => {
    const list = await callerAs(me).notification.list();
    expect(list.every((n) => !n.read)).toBe(true);
    expect(list.length).toBe(1);
  });

  it("unreadCount matches the unread list length", async () => {
    const count = await callerAs(me).notification.unreadCount();
    expect(count).toBe(1);
  });

  it("markAllRead clears the unread count", async () => {
    await callerAs(me).notification.markAllRead();
    const count = await callerAs(me).notification.unreadCount();
    expect(count).toBe(0);
  });

  it("requires auth", async () => {
    await expect(callerAs(null).notification.list()).rejects.toThrow();
  });
});
