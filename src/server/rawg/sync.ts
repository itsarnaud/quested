import { prisma } from "@/lib/prisma";
import type { RawgGame } from "@/server/rawg/client";
import {
  findMatchingGame,
  createCanonicalGame,
  linkExternalId,
  enrichGameTaxonomy,
} from "@/server/games/dedup";

function releaseDate(rawgGame: RawgGame): Date | null {
  if (!rawgGame.released) return null;
  return new Date(rawgGame.released);
}

/**
 * Upserts a RAWG search result into the canonical Game table.
 *
 * Same match order as IGDB: existing GameExternalId link > same
 * normalized title + release year (dedupes against a game already
 * imported from IGDB) > create a brand new canonical Game.
 */
export async function upsertGameFromRawg(rawgGame: RawgGame) {
  const sourceId = String(rawgGame.id);

  const existingLink = await prisma.gameExternalId.findUnique({
    where: { source_sourceId: { source: "RAWG", sourceId } },
    include: { game: true },
  });
  if (existingLink) return existingLink.game;

  const date = releaseDate(rawgGame);
  const year = date ? date.getUTCFullYear() : null;
  const genres = rawgGame.genres?.map((g) => g.name) ?? [];
  const platforms = rawgGame.platforms?.map((p) => p.platform.name) ?? [];
  const developers = rawgGame.developers?.map((d) => d.name) ?? [];
  const match = await findMatchingGame(rawgGame.name, year);

  if (match) {
    await linkExternalId(match.id, "RAWG", sourceId);
    return enrichGameTaxonomy(match, genres, platforms, developers);
  }

  return createCanonicalGame({
    title: rawgGame.name,
    year,
    releaseDate: date,
    coverUrl: rawgGame.background_image,
    summary: null,
    genres,
    platforms,
    developers,
    source: "RAWG",
    sourceId,
  });
}
