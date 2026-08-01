import { prisma } from "@/lib/prisma";
import { getIgdbGamesByIds, resolveIgdbIdsBySteamAppIds, type IgdbGame } from "@/server/igdb/client";
import { upsertGameFromIgdb } from "@/server/igdb/sync";
import { createCanonicalGame, linkExternalId } from "@/server/games/dedup";
import type { SteamOwnedGame } from "@/lib/steam-auth";

type SteamApp = SteamOwnedGame;

/**
 * Resolves a single Steam app to a canonical Game. Match order: existing
 * GameExternalId(STEAM, appid) link from a prior sync (fast path, no
 * external calls) > IGDB match via external_games (piggybacks on the
 * existing IGDB dedup pipeline, then remembers the STEAM link for next
 * time) > a bare Game created straight from Steam's own data, for the
 * apps IGDB doesn't know about (tools, soundtracks, obscure titles).
 */
async function upsertGameFromSteamApp(app: SteamApp, igdbGameByAppId: Map<string, IgdbGame>) {
  const sourceId = String(app.appid);

  const existingLink = await prisma.gameExternalId.findUnique({
    where: { source_sourceId: { source: "STEAM", sourceId } },
    include: { game: true },
  });
  if (existingLink) return existingLink.game;

  const igdbGame = igdbGameByAppId.get(sourceId);
  if (igdbGame) {
    const game = await upsertGameFromIgdb(igdbGame);
    await linkExternalId(game.id, "STEAM", sourceId);
    return game;
  }

  return createCanonicalGame({
    title: app.name,
    year: null,
    releaseDate: null,
    coverUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${app.appid}/header.jpg`,
    summary: null,
    genres: [],
    platforms: ["PC"],
    developers: [],
    source: "STEAM",
    sourceId,
  });
}

export async function syncSteamLibraryPage(
  userId: string,
  ownedGames: SteamApp[],
  offset: number,
  limit: number,
) {
  const page = ownedGames.slice(offset, offset + limit);

  // Only pay for IGDB resolution on apps we haven't already linked in a
  // previous sync.
  const alreadyLinked = await prisma.gameExternalId.findMany({
    where: { source: "STEAM", sourceId: { in: page.map((app) => String(app.appid)) } },
    select: { sourceId: true },
  });
  const linkedAppIds = new Set(alreadyLinked.map((l) => l.sourceId));
  const unresolvedAppIds = page.map((app) => String(app.appid)).filter((id) => !linkedAppIds.has(id));

  const appIdToIgdbId = await resolveIgdbIdsBySteamAppIds(unresolvedAppIds);
  const igdbGames = await getIgdbGamesByIds(Array.from(new Set(appIdToIgdbId.values())));
  const igdbGameById = new Map(igdbGames.map((g) => [g.id, g]));
  const igdbGameByAppId = new Map(
    Array.from(appIdToIgdbId.entries())
      .map(([appId, igdbId]) => [appId, igdbGameById.get(igdbId)] as const)
      .filter((entry): entry is [string, IgdbGame] => entry[1] !== undefined),
  );

  let imported = 0;
  let updated = 0;

  for (const app of page) {
    const game = await upsertGameFromSteamApp(app, igdbGameByAppId);

    const existingLog = await prisma.log.findUnique({
      where: { userId_gameId: { userId, gameId: game.id } },
    });

    await prisma.log.upsert({
      where: { userId_gameId: { userId, gameId: game.id } },
      update: { minutesPlayed: app.playtimeMinutes },
      create: {
        userId,
        gameId: game.id,
        status: app.playtimeMinutes > 0 ? "PLAYING" : "BACKLOG",
        minutesPlayed: app.playtimeMinutes,
      },
    });

    if (existingLog) updated++;
    else imported++;
  }

  return { imported, updated, done: offset + limit >= ownedGames.length };
}
