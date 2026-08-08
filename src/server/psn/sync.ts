import type { TrophyTitle } from "psn-api";
import { prisma } from "@/lib/prisma";
import { searchIgdbGames } from "@/server/igdb/client";
import { upsertGameFromIgdb } from "@/server/igdb/sync";
import { createCanonicalGame, linkExternalId, normalizeTitle } from "@/server/games/dedup";
import { getPsnUserTitles } from "@/server/psn/client";

// PSN's own platform codes, mapped to IGDB's naming so a bare fallback Game
// (see upsertGameFromPsnTitle) reads consistently with IGDB-sourced ones.
const PLATFORM_NAMES: Record<string, string> = {
  PS5: "PlayStation 5",
  PS4: "PlayStation 4",
  PS3: "PlayStation 3",
  Vita: "PlayStation Vita",
};

function psnPlatformsToNames(trophyTitlePlatform: string): string[] {
  return trophyTitlePlatform.split(",").map((p) => PLATFORM_NAMES[p.trim()] ?? p.trim());
}

/**
 * Resolves a single PSN trophy title to a canonical Game. Match order:
 * existing GameExternalId(PSN, npCommunicationId) link from a prior sync
 * (fast path) > an IGDB search result whose title matches exactly once
 * normalized (PSN has no crosswalk table like Steam's external_games, so
 * this is a text match rather than an ID lookup) > a bare Game created
 * straight from PSN's own title data, for anything that doesn't confidently
 * match (DLC-only trophy sets, regional variants, etc).
 */
// GameExternalId only has (source, sourceId) — npServiceName ("trophy" vs
// "trophy2") is required by every later trophy API call but isn't derivable
// from npCommunicationId alone, so it's packed into the sourceId itself
// rather than adding a schema field used by nothing else. See parsePsnSourceId.
export function encodePsnSourceId(title: Pick<TrophyTitle, "npCommunicationId" | "npServiceName">): string {
  return `${title.npServiceName}:${title.npCommunicationId}`;
}

export function parsePsnSourceId(sourceId: string): { npServiceName: "trophy" | "trophy2"; npCommunicationId: string } {
  const [npServiceName, npCommunicationId] = sourceId.split(":");
  return { npServiceName: npServiceName as "trophy" | "trophy2", npCommunicationId };
}

async function upsertGameFromPsnTitle(title: TrophyTitle) {
  const sourceId = encodePsnSourceId(title);

  const existingLink = await prisma.gameExternalId.findUnique({
    where: { source_sourceId: { source: "PSN", sourceId } },
    include: { game: true },
  });
  if (existingLink) return existingLink.game;

  const normalized = normalizeTitle(title.trophyTitleName);
  const igdbResults = await searchIgdbGames(title.trophyTitleName, 5);
  const igdbMatch = igdbResults.find((g) => normalizeTitle(g.name) === normalized);

  if (igdbMatch) {
    const game = await upsertGameFromIgdb(igdbMatch);
    await linkExternalId(game.id, "PSN", sourceId);
    return game;
  }

  return createCanonicalGame({
    title: title.trophyTitleName,
    year: null,
    releaseDate: null,
    coverUrl: title.trophyTitleIconUrl,
    summary: null,
    genres: [],
    platforms: psnPlatformsToNames(title.trophyTitlePlatform),
    developers: [],
    source: "PSN",
    sourceId,
  });
}

function statusFromProgress(progress: number): "COMPLETED" | "PLAYING" | "BACKLOG" {
  if (progress >= 100) return "COMPLETED";
  if (progress > 0) return "PLAYING";
  return "BACKLOG";
}

export async function syncPsnLibraryPage(userId: string, accountId: string, offset: number, limit: number) {
  const { trophyTitles, totalItemCount } = await getPsnUserTitles(accountId, offset, limit);

  let imported = 0;
  let updated = 0;

  for (const title of trophyTitles) {
    const game = await upsertGameFromPsnTitle(title);

    const existingLog = await prisma.log.findUnique({
      where: { userId_gameId: { userId, gameId: game.id } },
    });

    // Only set a status on first import — PSN gives no signal (like Steam's
    // playtime) worth re-syncing onto a log the user may have already set
    // themselves, so a resync must never clobber their own status choice.
    if (!existingLog) {
      await prisma.log.create({
        data: { userId, gameId: game.id, status: statusFromProgress(title.progress) },
      });
    }

    if (existingLog) updated++;
    else imported++;
  }

  return { imported, updated, done: offset + limit >= totalItemCount, total: totalItemCount };
}
