import { prisma } from "@/lib/prisma";
import { toCoverUrl, toArtworkUrl, type IgdbGame } from "@/server/igdb/client";
import {
  findMatchingGame,
  createCanonicalGame,
  linkExternalId,
  enrichGameTaxonomy,
} from "@/server/games/dedup";

function releaseDate(igdbGame: IgdbGame): Date | null {
  if (!igdbGame.first_release_date) return null;
  return new Date(igdbGame.first_release_date * 1000);
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

  const date = releaseDate(igdbGame);
  const year = date ? date.getUTCFullYear() : null;
  const genres = igdbGame.genres?.map((g) => g.name) ?? [];
  const platforms = igdbGame.platforms?.map((p) => p.name) ?? [];
  const developers = igdbGame.involved_companies
    ?.filter((c) => c.developer)
    .map((c) => c.company.name) ?? [];
  const match = await findMatchingGame(igdbGame.name, year);

  if (match) {
    await linkExternalId(match.id, "IGDB", sourceId);
    return enrichGameTaxonomy(match, genres, platforms, developers);
  }

  return createCanonicalGame({
    title: igdbGame.name,
    year,
    releaseDate: date,
    coverUrl: toCoverUrl(igdbGame.cover),
    artworkUrl: toArtworkUrl(igdbGame.artworks),
    summary: igdbGame.summary ?? null,
    genres,
    platforms,
    developers,
    source: "IGDB",
    sourceId,
  });
}
