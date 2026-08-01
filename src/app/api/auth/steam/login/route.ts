import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSteamAuthorizationUrl } from "@/lib/steam-auth";
import { siteUrl } from "@/lib/site";

// Steam only ever *links* onto an existing session (see src/lib/steam-auth.ts
// for why it can't be a normal Auth.js sign-in provider) — so there's
// nothing useful to do here if nobody's logged in yet.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", siteUrl));
  }

  const { searchParams } = new URL(req.url);
  const redirectTo = searchParams.get("redirectTo");
  const safeRedirectTo = redirectTo?.startsWith("/") ? redirectTo : "/account/comptes-lies";

  const returnTo = `${siteUrl}/api/auth/steam/callback?redirectTo=${encodeURIComponent(safeRedirectTo)}`;
  return NextResponse.redirect(getSteamAuthorizationUrl(returnTo));
}
