// One-off admin script, run roughly every ~2 months when the PSN refresh
// token expires (or once, the first time PSN integration is set up).
// Exchanges a fresh NPSSO for an access/refresh token pair and stores it as
// the app-level PsnServiceToken singleton every user's PSN lookups go through.
//
// The account settings page also has a "PSN token" admin form that does the
// same thing without a terminal — this script is the fallback/CLI path.
//
// Usage:
//   1. Log into https://www.playstation.com in a browser
//   2. Visit https://ca.account.sony.com/api/v1/ssocookie and copy the "npsso" value
//   3. Add PSN_NPSSO=<value> to your local .env
//   4. npx tsx --env-file=.env scripts/psn-seed-token.ts
import { seedPsnServiceToken } from "../src/server/psn/client";
import { prisma } from "../src/lib/prisma";

async function main() {
  const npsso = process.env.PSN_NPSSO;
  if (!npsso) {
    console.error("Missing PSN_NPSSO in the environment. See the usage comment at the top of this script.");
    process.exit(1);
  }

  const { refreshTokenExpiresInDays } = await seedPsnServiceToken(npsso);
  console.log(`PSN service token stored. Refresh token valid for ~${refreshTokenExpiresInDays} days.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
