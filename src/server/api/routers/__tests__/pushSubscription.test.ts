import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { callerAs } from "@/server/api/routers/__tests__/test-helpers";

const PREFIX = "vitest-push-";
const ENDPOINT = "https://push.example.test/vitest-push-endpoint";

async function cleanup() {
  await prisma.pushSubscription.deleteMany({ where: { endpoint: ENDPOINT } });
  await prisma.user.deleteMany({ where: { username: { startsWith: PREFIX } } });
}

describe("pushSubscription router", () => {
  let user: { id: string };

  beforeAll(async () => {
    await cleanup();
    user = await prisma.user.create({
      data: { username: `${PREFIX}user`, name: "User", email: `${PREFIX}user@test.local` },
    });
  });

  afterAll(cleanup);

  it("is not subscribed before subscribing", async () => {
    const result = await callerAs(user).pushSubscription.isSubscribed({ endpoint: ENDPOINT });
    expect(result).toBe(false);
  });

  it("subscribes and reports as subscribed", async () => {
    await callerAs(user).pushSubscription.subscribe({
      endpoint: ENDPOINT,
      keys: { p256dh: "key", auth: "auth" },
    });
    const result = await callerAs(user).pushSubscription.isSubscribed({ endpoint: ENDPOINT });
    expect(result).toBe(true);
  });

  it("unsubscribes and reports as no longer subscribed", async () => {
    await callerAs(user).pushSubscription.unsubscribe({ endpoint: ENDPOINT });
    const result = await callerAs(user).pushSubscription.isSubscribed({ endpoint: ENDPOINT });
    expect(result).toBe(false);
  });

  it("requires auth", async () => {
    await expect(
      callerAs(null).pushSubscription.subscribe({ endpoint: ENDPOINT, keys: { p256dh: "a", auth: "b" } }),
    ).rejects.toThrow();
  });
});
