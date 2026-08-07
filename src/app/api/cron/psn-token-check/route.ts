import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAlertEmail } from "@/lib/mailer";
import { siteUrl } from "@/lib/site";

// Reminds the admin (via the same alert inbox as crash notifications) to
// re-seed the PSN service token before its refresh token expires — nothing
// short of a human re-visiting playstation.com can do that part, so this
// cron's only job is making sure that human doesn't forget.
const REMINDER_WINDOW_DAYS = 14;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await prisma.psnServiceToken.findUnique({ where: { id: "singleton" } });
  if (!token) return NextResponse.json({ sent: false, reason: "not-configured" });

  const daysUntilExpiry = (token.refreshTokenExpiresAt.getTime() - Date.now()) / 86_400_000;
  if (daysUntilExpiry > REMINDER_WINDOW_DAYS) {
    return NextResponse.json({ sent: false, reason: "not-due", daysUntilExpiry: Math.round(daysUntilExpiry) });
  }
  if (token.reminderSentAt) {
    return NextResponse.json({ sent: false, reason: "already-sent" });
  }

  await sendAlertEmail(
    "[Quested] Le token PSN expire bientôt",
    [
      `Le refresh token PSN expire dans ${Math.max(0, Math.round(daysUntilExpiry))} jour(s) (${token.refreshTokenExpiresAt.toISOString()}).`,
      "",
      "Pour le renouveler :",
      "1. Connecte-toi sur https://www.playstation.com",
      "2. Va sur https://ca.account.sony.com/api/v1/ssocookie et copie la valeur npsso",
      `3. Colle-la ici : ${siteUrl}/admin/psn-token`,
    ].join("\n"),
  );

  await prisma.psnServiceToken.update({ where: { id: "singleton" }, data: { reminderSentAt: new Date() } });

  return NextResponse.json({ sent: true });
}
