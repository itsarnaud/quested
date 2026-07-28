import { prisma } from "@/lib/prisma";
import { toCoverUrl, type IgdbGame } from "@/server/igdb/client";

const DIACRITICS = /[\u0300-\u036f]/g;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().normalize("NFD").replace(DIACRITICS, "").replace(/[^a-z0-9]+/g, "");
}

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
  const existingLink = await prisma.gameExternalId.findUnique({
    where: { source_sourceId: { source: "IGDB", sourceId: String(igdbGame.id) } },
    include: { game: true },
  });
  if (existingLink) return existingLink.game;

  const year = releaseYear(igdbGame);
  const normalized = normalizeTitle(igdbGame.name);

  const candidates = await prisma.game.findMany({
    where: { releaseYear: year },
  });
  const match = candidates.find((g) => normalizeTitle(g.title) === normalized);

  if (match) {
    await prisma.gameExternalId.create({
      data: { source: "IGDB", sourceId: String(igdbGame.id), gameId: match.id },
    });
    return match;
  }

  const baseSlug = slugify(igdbGame.name) || `game-${igdbGame.id}`;
  const slug = year ? `${baseSlug}-${year}` : baseSlug;

  return prisma.game.create({
    data: {
      slug,
      title: igdbGame.name,
      releaseYear: year,
      coverUrl: toCoverUrl(igdbGame.cover),
      summary: igdbGame.summary,
      externalIds: {
        create: { source: "IGDB", sourceId: String(igdbGame.id) },
      },
    },
  });
}
