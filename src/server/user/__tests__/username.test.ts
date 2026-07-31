import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { generateUniqueUsername } from "@/server/user/username";

const PREFIX = "vitest-uname-";

async function cleanup() {
  await prisma.user.deleteMany({ where: { username: { startsWith: PREFIX } } });
}

describe("generateUniqueUsername", () => {
  afterAll(cleanup);

  it("slugifies a display name", async () => {
    await cleanup();
    const username = await generateUniqueUsername(`${PREFIX}Jean Dupont`);
    expect(username).toBe(`${PREFIX.toLowerCase()}jean-dupont`);
  });

  it("strips accents", async () => {
    await cleanup();
    const username = await generateUniqueUsername(`${PREFIX}Éléa`);
    expect(username).toBe(`${PREFIX.toLowerCase()}elea`);
  });

  it("uses only the local part of an email", async () => {
    await cleanup();
    const username = await generateUniqueUsername(`${PREFIX}bob@example.com`);
    expect(username).toBe(`${PREFIX.toLowerCase()}bob`);
  });

  it("appends a numeric suffix when the base is already taken", async () => {
    await cleanup();
    const base = `${PREFIX}taken`;
    await prisma.user.create({ data: { username: base, email: `${base}@test.local` } });

    const username = await generateUniqueUsername(base);
    expect(username).toBe(`${base}-2`);
  });
});
