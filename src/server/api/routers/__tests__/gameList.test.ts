import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { callerAs } from "@/server/api/routers/__tests__/test-helpers";

const PREFIX = "vitest-list-";

async function cleanup() {
  const users = await prisma.user.findMany({ where: { username: { startsWith: PREFIX } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  await prisma.gameListItem.deleteMany({ where: { list: { userId: { in: ids } } } });
  await prisma.gameList.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { username: { startsWith: PREFIX } } });
  await prisma.game.deleteMany({ where: { slug: { startsWith: PREFIX } } });
}

describe("gameList router", () => {
  const ownerUsername = `${PREFIX}owner`;
  let owner: { id: string };
  let other: { id: string };
  let game: { id: string };

  beforeAll(async () => {
    await cleanup();
    owner = await prisma.user.create({
      data: { username: ownerUsername, name: "Owner", email: `${ownerUsername}@test.local` },
    });
    other = await prisma.user.create({
      data: { username: `${PREFIX}other`, name: "Other", email: `${PREFIX}other@test.local` },
    });
    game = await prisma.game.create({
      data: { slug: `${PREFIX}game`, title: "Test Game", platforms: [], developers: [], genres: [] },
    });
  });

  afterAll(cleanup);

  it("creates a list and adds a game to it", async () => {
    const list = await callerAs(owner).gameList.create({ title: "My favorites" });
    await callerAs(owner).gameList.addGame({ listId: list.id, gameId: game.id });

    const fetched = await callerAs(owner).gameList.get({ listId: list.id });
    expect(fetched.items).toHaveLength(1);
    expect(fetched.items[0].gameId).toBe(game.id);
  });

  it("byUser reports the item count and a preview", async () => {
    const lists = await callerAs(owner).gameList.byUser({ username: ownerUsername });
    expect(lists).toHaveLength(1);
    expect(lists[0].itemCount).toBe(1);
    expect(lists[0].preview[0].id).toBe(game.id);
  });

  it("prevents someone else from updating your list", async () => {
    const [list] = await callerAs(owner).gameList.byUser({ username: ownerUsername });
    await expect(
      callerAs(other).gameList.update({ listId: list.id, title: "Hijacked" }),
    ).rejects.toThrow();
  });

  it("prevents someone else from deleting your list", async () => {
    const [list] = await callerAs(owner).gameList.byUser({ username: ownerUsername });
    await expect(callerAs(other).gameList.delete({ listId: list.id })).rejects.toThrow();
  });

  it("clone copies the list under the cloner's account", async () => {
    const [list] = await callerAs(owner).gameList.byUser({ username: ownerUsername });
    const cloned = await callerAs(other).gameList.clone({ listId: list.id });
    const fetched = await callerAs(other).gameList.get({ listId: cloned.listId });
    expect(fetched.userId).toBe(other.id);
    expect(fetched.items).toHaveLength(1);
  });

  it("requires auth to create a list", async () => {
    await expect(callerAs(null).gameList.create({ title: "Nope" })).rejects.toThrow();
  });
});
