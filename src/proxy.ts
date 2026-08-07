import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

// Paths a not-yet-onboarded user must still be able to reach — the
// onboarding page itself (obviously) and the login page.
const EXEMPT_PATHS = ["/onboarding", "/login"];

function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

function localePrefix(pathname: string): string {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) return `/${locale}`;
  }
  return "";
}

// Proxy defaults to the Node.js runtime in this Next.js version (renamed
// from "middleware"), so a real Prisma-backed auth() call is safe here — no
// Edge-runtime workaround needed.
export default async function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);

  // A locale redirect/rewrite from next-intl takes priority — let it
  // resolve first and re-check onboarding on the follow-up request instead
  // of stacking a second redirect on top.
  if (response.headers.get("location")) {
    return response;
  }

  const { pathname } = request.nextUrl;
  const bare = stripLocale(pathname);
  if (EXEMPT_PATHS.some((p) => bare === p || bare.startsWith(`${p}/`))) {
    return response;
  }

  const session = await auth();
  if (session?.user && !session.user.onboardedAt) {
    return NextResponse.redirect(new URL(`${localePrefix(pathname)}/onboarding`, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
