import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSteamPlayerSummary, verifySteamAssertion } from "@/lib/steam-auth";
import { siteUrl } from "@/lib/site";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", siteUrl));
  }

  const { searchParams } = new URL(req.url);
  const redirectToParam = searchParams.get("redirectTo");
  const redirectTo = redirectToParam?.startsWith("/") ? redirectToParam : "/account/comptes-lies";
  const errorRedirect = (error: string) =>
    NextResponse.redirect(new URL(`${redirectTo}?error=${error}`, siteUrl));

  // Must match the exact `return_to` the login route sent Steam, byte for
  // byte — it's part of what gets signature-checked.
  const returnTo = `${siteUrl}/api/auth/steam/callback?redirectTo=${encodeURIComponent(redirectTo)}`;

  const steamId = await verifySteamAssertion(searchParams, returnTo);
  if (!steamId) {
    return errorRedirect("steam-link-failed");
  }

  const existing = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: "steam", providerAccountId: steamId } },
  });
  if (existing && existing.userId !== session.user.id) {
    return errorRedirect("steam-taken");
  }

  let personaName: string;
  try {
    ({ personaName } = await getSteamPlayerSummary(steamId));
  } catch (err) {
    console.error("Failed to fetch Steam player summary:", err);
    return errorRedirect("steam-link-failed");
  }

  if (existing) {
    await prisma.account.update({ where: { id: existing.id }, data: { providerLabel: personaName } });
  } else {
    await prisma.account.create({
      data: {
        userId: session.user.id,
        type: "oauth",
        provider: "steam",
        providerAccountId: steamId,
        providerLabel: personaName,
      },
    });
  }

  return NextResponse.redirect(new URL(redirectTo, siteUrl));
}
