// One-off admin script: existing games have artworkUrl frozen at IGDB's
// t_1080p size from import time (toArtworkUrl now uses the lighter t_720p
// for new imports) — this rewrites already-stored URLs to match, no re-fetch
// needed since it's a plain string substitution in IGDB's own URL scheme.
// Usage: npx tsx --env-file=.env scripts/resize-artwork-urls.ts
import { prisma } from "../src/lib/prisma";

async function main() {
  const result = await prisma.$executeRaw`
    UPDATE "Game"
    SET "artworkUrl" = REPLACE("artworkUrl", 't_1080p', 't_720p')
    WHERE "artworkUrl" LIKE '%t_1080p%'
  `;
  console.log(`Done: ${result} game(s) updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
