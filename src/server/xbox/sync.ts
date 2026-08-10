import { prisma } from "@/lib/prisma";
import { searchIgdbGames } from "@/server/igdb/client";
import { upsertGameFromIgdb } from "@/server/igdb/sync";
import { createCanonicalGame, linkExternalId, normalizeTitle } from "@/server/games/dedup";
import { getXboxTitleHistory, type XboxTitle } from "@/server/xbox/client";

// Xbox's own device codes, mapped to IGDB's naming — same reasoning as
// PSN's PLATFORM_NAMES (see src/server/psn/sync.ts): keeps a bare fallback
// Game's platform list consistent with IGDB-sourced ones, and is also used
// to disambiguate IGDB search results sharing the exact same title.
const DEVICE_NAMES: Record<string, string> = {
  XboxOne: "Xbox One",
  XboxSeries: "Xbox Series X|S",
  PC: "PC (Microsoft Windows)",
  Win32: "PC (Microsoft Windows)",
  "Nintendo Switch": "Nintendo Switch",
};

function xboxDevicesToNames(devices: string[]): string[] {
  return devices.map((d) => DEVICE_NAMES[d] ?? d);
}

async function upsertGameFromXboxTitle(title: XboxTitle) {
  const sourceId = title.titleId;

  const existingLink = await prisma.gameExternalId.findUnique({
    where: { source_sourceId: { source: "XBOX", sourceId } },
    include: { game: true },
  });
  if (existingLink) return existingLink.game;

  const normalized = normalizeTitle(title.name);
  const igdbResults = await searchIgdbGames(title.name, 5);
  const titleMatches = igdbResults.filter((g) => normalizeTitle(g.name) === normalized);

  // Same duplicate-IGDB-entry guard as PSN's matching (see
  // src/server/psn/sync.ts) — prefer whichever same-named result actually
  // lists this title's own platform, rather than a bare .find().
  const deviceNames = new Set(xboxDevicesToNames(title.devices));
  const igdbMatch = titleMatches.find((g) => g.platforms?.some((p) => deviceNames.has(p.name))) ?? titleMatches[0];

  if (igdbMatch) {
    const game = await upsertGameFromIgdb(igdbMatch);
    await linkExternalId(game.id, "XBOX", sourceId);
    return game;
  }

  return createCanonicalGame({
    title: title.name,
    year: null,
    releaseDate: null,
    coverUrl: title.displayImage,
    summary: null,
    genres: [],
    platforms: xboxDevicesToNames(title.devices),
    developers: [],
    source: "XBOX",
    sourceId,
  });
}

function statusFromProgress(progressPercentage: number): "COMPLETED" | "PLAYING" | "BACKLOG" {
  if (progressPercentage >= 100) return "COMPLETED";
  if (progressPercentage > 0) return "PLAYING";
  return "BACKLOG";
}

// Unlike Steam/PSN's syncPage (offset/limit over a paginated provider
// call), OpenXBL's titleHistory returns the entire played-titles list in
// one request (verified — no pagination fields at all in the response), so
// there's nothing to paginate here. One call in, the whole library synced.
export async function syncXboxLibrary(userId: string, xuid: string) {
  const titles = await getXboxTitleHistory(xuid);

  let imported = 0;
  let updated = 0;

  for (const title of titles) {
    const game = await upsertGameFromXboxTitle(title);

    const existingLog = await prisma.log.findUnique({
      where: { userId_gameId: { userId, gameId: game.id } },
    });

    // Only set a status on first import — same reasoning as PSN/Steam: a
    // resync must never clobber a status the user chose themselves.
    if (!existingLog) {
      await prisma.log.create({
        data: { userId, gameId: game.id, status: statusFromProgress(title.achievement?.progressPercentage ?? 0) },
      });
    }

    if (existingLog) updated++;
    else imported++;
  }

  return { imported, updated, total: titles.length };
}
