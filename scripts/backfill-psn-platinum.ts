// One-off admin script: Achievement.isPlatinum didn't exist when earlier PSN
// syncs ran, so games imported before this shipped have every trophy's
// isPlatinum stuck at the column default (false) — including the real
// Platinum. Re-fetches each PSN game's trophy definitions (cheap, no
// per-user data) and flags the platinum one.
// Usage: npx tsx --env-file=.env scripts/backfill-psn-platinum.ts
import { prisma } from "../src/lib/prisma";
import { getPsnTitleTrophyDefinitions } from "../src/server/psn/client";
import { parsePsnSourceId } from "../src/server/psn/sync";

async function main() {
  const links = await prisma.gameExternalId.findMany({
    where: { source: "PSN" },
    select: { gameId: true, sourceId: true },
  });

  if (links.length === 0) {
    console.log("No PSN-sourced games found. Nothing to do.");
    return;
  }

  console.log(`Checking ${links.length} PSN-sourced game(s)...`);
  let updated = 0;

  for (const link of links) {
    const alreadyFlagged = await prisma.achievement.findFirst({
      where: { gameId: link.gameId, isPlatinum: true },
    });
    if (alreadyFlagged) continue;

    const title = parsePsnSourceId(link.sourceId);
    const { trophies } = await getPsnTitleTrophyDefinitions(title).catch(() => ({ trophies: [] }));
    const platinumTrophy = trophies.find((t) => t.trophyType === "platinum");
    if (!platinumTrophy) continue;

    const result = await prisma.achievement.updateMany({
      where: { gameId: link.gameId, apiName: String(platinumTrophy.trophyId) },
      data: { isPlatinum: true },
    });
    if (result.count > 0) updated++;
  }

  console.log(`Done: ${updated} game(s) had their Platinum trophy flagged.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
