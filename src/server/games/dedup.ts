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

export async function createCanonicalGame(input: {
  title: string;
  year: number | null;
  coverUrl: string | null;
  summary: string | null;
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
      coverUrl: input.coverUrl,
      summary: input.summary,
      externalIds: {
        create: { source: input.source, sourceId: input.sourceId },
      },
    },
  });
}

export async function linkExternalId(gameId: string, source: GameSource, sourceId: string) {
  await prisma.gameExternalId.create({ data: { source, sourceId, gameId } });
}
