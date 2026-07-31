import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createCanonicalGame,
  enrichGameTaxonomy,
  findMatchingGame,
  linkExternalId,
  normalizeTitle,
  slugify,
} from "@/server/games/dedup";

describe("slugify", () => {
  it("lowercases and dashes non-alphanumeric runs", () => {
    expect(slugify("Baldur's Gate 3")).toBe("baldur-s-gate-3");
  });

  it("strips accents", () => {
    expect(slugify("Pokémon Écarlate")).toBe("pokemon-ecarlate");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("!!!Hollow Knight!!!")).toBe("hollow-knight");
  });
});

describe("normalizeTitle", () => {
  it("ignores case, accents and punctuation when comparing titles", () => {
    expect(normalizeTitle("Pokémon: Écarlate!")).toBe(normalizeTitle("pokemon ecarlate"));
  });
});

const PREFIX = "vitest-dedup-";

async function cleanup() {
  await prisma.game.deleteMany({ where: { slug: { startsWith: PREFIX } } });
}

describe("findMatchingGame", () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.game.create({
      data: { slug: `${PREFIX}bg3-2023`, title: "Baldur's Gate 3", releaseYear: 2023, platforms: [], developers: [], genres: [] },
    });
  });

  afterAll(cleanup);

  it("matches on the same normalized title and release year", async () => {
    const match = await findMatchingGame("baldur's gate 3", 2023);
    expect(match?.slug).toBe(`${PREFIX}bg3-2023`);
  });

  it("does not match a different release year", async () => {
    const match = await findMatchingGame("Baldur's Gate 3", 2024);
    expect(match).toBeNull();
  });

  it("does not match a different title", async () => {
    const match = await findMatchingGame("Baldur's Gate 2", 2023);
    expect(match).toBeNull();
  });
});

describe("createCanonicalGame + enrichGameTaxonomy + linkExternalId", () => {
  afterAll(cleanup);

  it("appends the year to the slug when one is known", async () => {
    const game = await createCanonicalGame({
      title: "Vitest Dedup Game",
      year: 2022,
      releaseDate: null,
      coverUrl: null,
      summary: null,
      genres: [],
      platforms: [],
      developers: [],
      source: "IGDB",
      sourceId: `${PREFIX}src-1`,
    });
    expect(game.slug).toBe("vitest-dedup-game-2022");

    await prisma.game.update({ where: { id: game.id }, data: { slug: `${PREFIX}created-1` } });
  });

  it("falls back to a source-id slug when the title has no usable characters", async () => {
    const game = await createCanonicalGame({
      title: "!!!",
      year: null,
      releaseDate: null,
      coverUrl: null,
      summary: null,
      genres: [],
      platforms: [],
      developers: [],
      source: "RAWG",
      sourceId: `${PREFIX}src-2`,
    });
    expect(game.slug).toBe(`game-${PREFIX}src-2`);
    await prisma.game.update({ where: { id: game.id }, data: { slug: `${PREFIX}created-2` } });
  });

  it("enriches an untaxonomized game and leaves an already-taxonomized one alone", async () => {
    const bare = await prisma.game.create({
      data: { slug: `${PREFIX}bare`, title: "Bare Game", platforms: [], developers: [], genres: [] },
    });
    const enriched = await enrichGameTaxonomy(bare, ["RPG"], ["PC"], ["Studio"]);
    expect(enriched.genres).toEqual(["RPG"]);

    const fromDb = await prisma.game.findUniqueOrThrow({ where: { id: bare.id } });
    expect(fromDb.genres).toEqual(["RPG"]);

    const alreadyTaxonomized = { ...enriched };
    const untouched = await enrichGameTaxonomy(alreadyTaxonomized, ["Action"], ["PS5"], ["Other Studio"]);
    expect(untouched.genres).toEqual(["RPG"]);
  });

  it("links an external id to a game", async () => {
    const game = await prisma.game.create({
      data: { slug: `${PREFIX}linked`, title: "Linked Game", platforms: [], developers: [], genres: [] },
    });
    await linkExternalId(game.id, "IGDB", `${PREFIX}ext-id`);

    const link = await prisma.gameExternalId.findFirst({ where: { gameId: game.id, source: "IGDB" } });
    expect(link?.sourceId).toBe(`${PREFIX}ext-id`);
  });
});
