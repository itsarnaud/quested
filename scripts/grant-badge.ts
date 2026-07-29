/**
 * Grants a badge to a user by username. Badges are manually assigned, not
 * user-editable — this is the only way to add one.
 *
 * Usage: npm run grant-badge -- <username> <FOUNDER|EARLY_ADOPTER|BETA_TESTER>
 */
import { prisma } from "@/lib/prisma";
import type { Badge } from "@/generated/prisma/client";

const VALID_BADGES: Badge[] = ["FOUNDER", "EARLY_ADOPTER", "BETA_TESTER"];

async function main() {
  const [username, badge] = process.argv.slice(2);

  if (!username || !badge || !VALID_BADGES.includes(badge as Badge)) {
    console.error(`Usage: npm run grant-badge -- <username> <${VALID_BADGES.join("|")}>`);
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    console.error(`No user found with username "${username}".`);
    process.exit(1);
  }

  if (user.badges.includes(badge as Badge)) {
    console.log(`@${username} already has the ${badge} badge.`);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { badges: { push: badge as Badge } },
  });

  console.log(`Granted ${badge} to @${username}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
