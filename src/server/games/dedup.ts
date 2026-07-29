import { prisma } from "@/lib/prisma";
import type { GameSource } from "@/generated/prisma/client";

const DIACRITICS = /[\u0300-\u036f]/g;

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeTitle(title: string): string {
  return title.toLowerCase().normalize("NFD").replace(DIACRITICS, "").replace(/[^a-z0-9]+/g, "");
}

/**
 * Finds a canonical Game likely to be the same title from another source:
 * same release year, same normalized title. Used to avoid creating a
 * duplicate Game when the same title is imported from IGDB and RAWG.
 */
export async function findMatchingGame(title: string, year: number | null) {
  const normalized = normalizeTitle(title);
  const candidates = await prisma.game.findMany({ where: { releaseYear: year } });
  return candidates.find((g) => normalizeTitle(g.title) === normalized) ?? null;
}

/**
 * Fills in genres/platforms/developers on an already-canonical game if it
 * doesn't have them yet — happens when the game was first imported from a
 * source that didn't return this data, and a later source (searched again) does.
 */
export async function enrichGameTaxonomy<
  T extends { id: string; genres: string[]; platforms: string[]; developers: string[] },
>(game: T, genres: string[], platforms: string[], developers: string[]): Promise<T> {
  const hasTaxonomy = game.genres.length > 0 || game.platforms.length > 0 || game.developers.length > 0;
  if (hasTaxonomy) return game;
  if (genres.length === 0 && platforms.length === 0 && developers.length === 0) return game;

  await prisma.game.update({
    where: { id: game.id },
    data: { genres, platforms, developers },
  });

  return { ...game, genres, platforms, developers };
}

export async function createCanonicalGame(input: {
  title: string;
  year: number | null;
  releaseDate: Date | null;
  coverUrl: string | null;
  summary: string | null;
  genres: string[];
  platforms: string[];
  developers: string[];
  source: GameSource;
  sourceId: string;
}) {
  const baseSlug = slugify(input.title) || `game-${input.sourceId}`;
  const slug = input.year ? `${baseSlug}-${input.year}` : baseSlug;

  return prisma.game.create({
    data: {
      slug,
      title: input.title,
      releaseYear: input.year,
      releaseDate: input.releaseDate,
      coverUrl: input.coverUrl,
      summary: input.summary,
      genres: input.genres,
      platforms: input.platforms,
      developers: input.developers,
      externalIds: {
        create: { source: input.source, sourceId: input.sourceId },
      },
    },
  });
}

export async function linkExternalId(gameId: string, source: GameSource, sourceId: string) {
  await prisma.gameExternalId.create({ data: { source, sourceId, gameId } });
}
