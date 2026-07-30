import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";
import { renderGameReleasedEmail } from "@/lib/email-templates";
import { sendPushToUser } from "@/lib/push";

const LOOKBACK_DAYS = 2;

// Called daily by the /api/cron/game-releases route. Looks for games that
// released in the last couple of days and notifies users who still have
// them marked as WISHLIST — the lookback window (rather than exactly
// "today") covers cron misses, and the unique (userId, gameId, type)
// constraint on Notification makes re-running this safe.
export async function notifyGameReleases() {
  const now = new Date();
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const releasedGames = await prisma.game.findMany({
    where: {
      releaseDate: { gte: since, lte: now },
      logs: { some: { status: "WISHLIST" } },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      logs: {
        where: { status: "WISHLIST" },
        select: { user: { select: { id: true, email: true, emailOnRelease: true } } },
      },
    },
  });

  let notified = 0;

  for (const game of releasedGames) {
    for (const log of game.logs) {
      const created = await prisma.notification
        .create({ data: { userId: log.user.id, type: "RELEASE", gameId: game.id } })
        .catch((err) => {
          if (err?.code === "P2002") return null; // already notified for this game
          throw err;
        });
      if (!created) continue;

      notified += 1;

      if (log.user.emailOnRelease && log.user.email) {
        const { subject, html } = renderGameReleasedEmail({ gameTitle: game.title, gameSlug: game.slug });
        sendEmail({ to: log.user.email, subject, html }).catch((err) =>
          console.error("Failed to send release email:", err),
        );
      }

      sendPushToUser(log.user.id, {
        title: "Quested",
        body: `${game.title}, dans ta liste d'envies, est sorti !`,
        url: `/games/${game.slug}`,
      }).catch((err) => console.error("Failed to send release push:", err));
    }
  }

  return { gamesChecked: releasedGames.length, notified };
}
