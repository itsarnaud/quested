import { prisma } from "@/lib/prisma";
import { toCoverUrl, type IgdbGame } from "@/server/igdb/client";
import {
  findMatchingGame,
  createCanonicalGame,
  linkExternalId,
  enrichGameTaxonomy,
} from "@/server/games/dedup";

function releaseYear(igdbGame: IgdbGame): number | null {
  if (!igdbGame.first_release_date) return null;
  return new Date(igdbGame.first_release_date * 1000).getUTCFullYear();
}

/**
 * Upserts an IGDB search result into the canonical Game table.
 *
 * Match order: existing GameExternalId link (already imported) > same
 * normalized title + release year (likely the same game from another
 * source) > create a brand new canonical Game.
 */
export async function upsertGameFromIgdb(igdbGame: IgdbGame) {
  const sourceId = String(igdbGame.id);

  const existingLink = await prisma.gameExternalId.findUnique({
    where: { source_sourceId: { source: "IGDB", sourceId } },
    include: { game: true },
  });
  if (existingLink) return existingLink.game;

  const year = releaseYear(igdbGame);
  const genres = igdbGame.genres?.map((g) => g.name) ?? [];
  const platforms = igdbGame.platforms?.map((p) => p.name) ?? [];
  const match = await findMatchingGame(igdbGame.name, year);

  if (match) {
    await linkExternalId(match.id, "IGDB", sourceId);
    return enrichGameTaxonomy(match, genres, platforms);
  }

  return createCanonicalGame({
    title: igdbGame.name,
    year,
    coverUrl: toCoverUrl(igdbGame.cover),
    summary: igdbGame.summary ?? null,
    genres,
    platforms,
    source: "IGDB",
    sourceId,
  });
}
