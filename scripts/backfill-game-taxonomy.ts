/**
 * One-off maintenance script: refreshes genres/platforms/developers/release
 * date on games imported before that data existed, without touching Games,
 * Logs or anything else that isn't explicitly listed here — no deletion.
 *
 * Usage: npm run backfill:taxonomy
 */
import { prisma } from "@/lib/prisma";
import { getIgdbGamesByIds, type IgdbGame } from "@/server/igdb/client";
import { getRawgGameById, type RawgGame } from "@/server/rawg/client";

const IGDB_BATCH_SIZE = 50;
const RAWG_CONCURRENCY = 5;
const RAWG_DELAY_MS = 250;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fromIgdb(igdbGame: IgdbGame) {
  const date = igdbGame.first_release_date ? new Date(igdbGame.first_release_date * 1000) : null;
  return {
    releaseDate: date,
    releaseYear: date ? date.getUTCFullYear() : null,
    summary: igdbGame.summary ?? null,
    genres: igdbGame.genres?.map((g) => g.name) ?? [],
    platforms: igdbGame.platforms?.map((p) => p.name) ?? [],
    developers: igdbGame.involved_companies?.filter((c) => c.developer).map((c) => c.company.name) ?? [],
  };
}

function fromRawg(rawgGame: RawgGame) {
  const date = rawgGame.released ? new Date(rawgGame.released) : null;
  return {
    releaseDate: date,
    releaseYear: date ? date.getUTCFullYear() : null,
    genres: rawgGame.genres?.map((g) => g.name) ?? [],
    platforms: rawgGame.platforms?.map((p) => p.platform.name) ?? [],
    developers: rawgGame.developers?.map((d) => d.name) ?? [],
  };
}

async function main() {
  const games = await prisma.game.findMany({
    where: { releaseDate: null },
    include: { externalIds: true },
  });
  console.log(`${games.length} games missing release date/taxonomy.`);

  const igdbTargets = games
    .map((g) => ({ game: g, link: g.externalIds.find((e) => e.source === "IGDB") }))
    .filter((t): t is { game: (typeof games)[number]; link: NonNullable<typeof t.link> } => Boolean(t.link));

  const rawgTargets = games
    .filter((g) => !g.externalIds.some((e) => e.source === "IGDB"))
    .map((g) => ({ game: g, link: g.externalIds.find((e) => e.source === "RAWG") }))
    .filter((t): t is { game: (typeof games)[number]; link: NonNullable<typeof t.link> } => Boolean(t.link));

  let updated = 0;

  for (let i = 0; i < igdbTargets.length; i += IGDB_BATCH_SIZE) {
    const batch = igdbTargets.slice(i, i + IGDB_BATCH_SIZE);
    const ids = batch.map((t) => Number(t.link.sourceId));
    const igdbGames = await getIgdbGamesByIds(ids);
    const byId = new Map(igdbGames.map((g) => [String(g.id), g]));

    for (const { game, link } of batch) {
      const igdbGame = byId.get(link.sourceId);
      if (!igdbGame) continue;
      await prisma.game.update({ where: { id: game.id }, data: fromIgdb(igdbGame) });
      updated++;
    }
    console.log(`IGDB batch ${i / IGDB_BATCH_SIZE + 1}: ${batch.length} games processed.`);
  }

  for (let i = 0; i < rawgTargets.length; i += RAWG_CONCURRENCY) {
    const batch = rawgTargets.slice(i, i + RAWG_CONCURRENCY);
    await Promise.all(
      batch.map(async ({ game, link }) => {
        const rawgGame = await getRawgGameById(Number(link.sourceId));
        if (!rawgGame) return;
        await prisma.game.update({ where: { id: game.id }, data: fromRawg(rawgGame) });
        updated++;
      }),
    );
    await sleep(RAWG_DELAY_MS);
  }

  console.log(`Done. ${updated} games updated (no rows deleted).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
