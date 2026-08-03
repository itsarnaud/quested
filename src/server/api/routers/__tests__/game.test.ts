import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { callerAs } from "@/server/api/routers/__tests__/test-helpers";

const PREFIX = "vitest-game-";

async function cleanup() {
  await prisma.game.deleteMany({ where: { slug: { startsWith: PREFIX } } });
}

describe("game router", () => {
  beforeAll(async () => {
    await cleanup();
    // 9 local matches (>= the 8-match threshold) so `search` never falls
    // through to the live IGDB/RAWG APIs in these tests.
    await prisma.game.createMany({
      data: Array.from({ length: 9 }, (_, i) => ({
        slug: `${PREFIX}match-${i}`,
        title: `Vitest Match Game ${i}`,
        genres: i === 0 ? ["VitestOnlyGenre"] : [],
        platforms: i === 0 ? ["VitestOnlyPlatform"] : [],
        releaseYear: i === 0 ? 2021 : null,
      })),
    });
    await prisma.game.createMany({
      data: [
        { slug: `${PREFIX}suggest-base`, title: "Vitest Suggest Base", genres: ["VitestSuggestGenre"] },
        { slug: `${PREFIX}suggest-related`, title: "Vitest Suggest Related", genres: ["VitestSuggestGenre"] },
        { slug: `${PREFIX}suggest-unrelated`, title: "Vitest Suggest Unrelated", genres: ["VitestOtherGenre"] },
      ],
    });
  });

  afterAll(cleanup);

  it("search returns local matches without hitting external APIs", async () => {
    const results = await callerAs(null).game.search({ query: "Vitest Match Game" });
    expect(results.length).toBeGreaterThanOrEqual(9);
  });

  it("search with an empty query and no filters returns nothing", async () => {
    const results = await callerAs(null).game.search({ query: "" });
    expect(results).toEqual([]);
  });

  it("search with filters browses the local catalog only", async () => {
    const results = await callerAs(null).game.search({ query: "", genre: "VitestOnlyGenre" });
    expect(results.some((g) => g.slug === `${PREFIX}match-0`)).toBe(true);
    expect(results.every((g) => g.genres.includes("VitestOnlyGenre"))).toBe(true);
  });

  it("bySlug returns the matching game", async () => {
    const game = await callerAs(null).game.bySlug({ slug: `${PREFIX}match-0` });
    expect(game?.title).toBe("Vitest Match Game 0");
  });

  it("bySlug returns null for an unknown slug", async () => {
    const game = await callerAs(null).game.bySlug({ slug: `${PREFIX}does-not-exist` });
    expect(game).toBeNull();
  });

  it("filterOptions includes values from the seeded game", async () => {
    const options = await callerAs(null).game.filterOptions();
    expect(options.genres).toContain("VitestOnlyGenre");
    expect(options.platforms).toContain("VitestOnlyPlatform");
    expect(options.years).toContain(2021);
  });

  it("relatedSuggestions surfaces other games sharing a genre with the best match", async () => {
    const result = await callerAs(null).game.relatedSuggestions({ query: "Vitest Suggest Base" });
    expect(result?.basedOnTitle).toBe("Vitest Suggest Base");
    expect(result?.games.some((g) => g.slug === `${PREFIX}suggest-related`)).toBe(true);
    expect(result?.games.some((g) => g.slug === `${PREFIX}suggest-unrelated`)).toBe(false);
  });

  it("relatedSuggestions returns null for a query shorter than 2 characters", async () => {
    const result = await callerAs(null).game.relatedSuggestions({ query: "V" });
    expect(result).toBeNull();
  });

  it("relatedSuggestions returns null when there's no local match", async () => {
    const result = await callerAs(null).game.relatedSuggestions({ query: "NoSuchGameAtAllXYZ123" });
    expect(result).toBeNull();
  });
});
