// One-off admin script: fetches IGDB artwork images for already-imported
// games that don't have one yet (added after artworkUrl shipped).
// Usage: npx tsx --env-file=.env scripts/backfill-artwork-urls.ts
import { prisma } from "../src/lib/prisma";
import { getIgdbGamesByIds, toArtworkUrl } from "../src/server/igdb/client";

const BATCH_SIZE = 50;

async function main() {
  const links = await prisma.gameExternalId.findMany({
    where: { source: "IGDB", game: { artworkUrl: null } },
    select: { sourceId: true, gameId: true },
  });

  if (links.length === 0) {
    console.log("Every IGDB-sourced game already has an artwork (or none available). Nothing to do.");
    return;
  }

  console.log(`Backfilling artwork for ${links.length} game(s)...`);
  let updated = 0;

  for (let i = 0; i < links.length; i += BATCH_SIZE) {
    const batch = links.slice(i, i + BATCH_SIZE);
    const igdbGames = await getIgdbGamesByIds(batch.map((l) => Number(l.sourceId)));
    const gameIdBySourceId = new Map(batch.map((l) => [l.sourceId, l.gameId]));

    for (const igdbGame of igdbGames) {
      const artworkUrl = toArtworkUrl(igdbGame.artworks);
      if (!artworkUrl) continue;
      const gameId = gameIdBySourceId.get(String(igdbGame.id));
      if (!gameId) continue;
      await prisma.game.update({ where: { id: gameId }, data: { artworkUrl } });
      updated++;
    }
  }

  console.log(`Done: ${updated} game(s) updated with an artwork.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
