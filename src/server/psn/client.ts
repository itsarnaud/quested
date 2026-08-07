import {
  exchangeNpssoForAccessCode,
  exchangeAccessCodeForAuthTokens,
  exchangeRefreshTokenForAuthTokens,
  getProfileFromUserName,
  getUserTitles,
  getTitleTrophies,
  getUserTrophiesEarnedForTitle,
  type AuthorizationPayload,
  type TrophyTitle,
} from "psn-api";
import { prisma } from "@/lib/prisma";

const SINGLETON_ID = "singleton";
// Refresh a bit before actual expiry to avoid a request racing the exact
// expiry instant — same margin used for the IGDB app token.
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

export class PsnNotConfiguredError extends Error {
  constructor() {
    super("No PSN service token configured — run scripts/psn-seed-token.ts.");
    this.name = "PsnNotConfiguredError";
  }
}

export class PsnRefreshExpiredError extends Error {
  constructor() {
    super("The PSN service refresh token has expired — rerun scripts/psn-seed-token.ts with a fresh NPSSO.");
    this.name = "PsnRefreshExpiredError";
  }
}

// Returns a ready-to-use authorization, transparently refreshing the
// app-level access token from the stored refresh token when it's stale.
// Every caller in this module goes through here — nothing else touches
// PsnServiceToken directly.
export async function getPsnAuthorization(): Promise<AuthorizationPayload> {
  const stored = await prisma.psnServiceToken.findUnique({ where: { id: SINGLETON_ID } });
  if (!stored) throw new PsnNotConfiguredError();

  if (stored.accessTokenExpiresAt.getTime() - EXPIRY_SAFETY_MARGIN_MS > Date.now()) {
    return { accessToken: stored.accessToken };
  }

  if (stored.refreshTokenExpiresAt.getTime() < Date.now()) {
    throw new PsnRefreshExpiredError();
  }

  const refreshed = await exchangeRefreshTokenForAuthTokens(stored.refreshToken);
  const now = Date.now();
  await prisma.psnServiceToken.update({
    where: { id: SINGLETON_ID },
    data: {
      accessToken: refreshed.accessToken,
      accessTokenExpiresAt: new Date(now + refreshed.expiresIn * 1000),
      refreshToken: refreshed.refreshToken,
      refreshTokenExpiresAt: new Date(now + refreshed.refreshTokenExpiresIn * 1000),
    },
  });

  return { accessToken: refreshed.accessToken };
}

// Exchanges a fresh NPSSO for tokens and (re)writes the PsnServiceToken
// singleton — the one piece of the auth flow that still needs a human to
// have logged into playstation.com moments earlier. Used by both the
// terminal seed script and the admin page's "paste a new NPSSO" form, so
// there's exactly one place this logic lives.
export async function seedPsnServiceToken(npsso: string): Promise<{ refreshTokenExpiresInDays: number }> {
  const accessCode = await exchangeNpssoForAccessCode(npsso);
  const tokens = await exchangeAccessCodeForAuthTokens(accessCode);

  const now = Date.now();
  await prisma.psnServiceToken.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: new Date(now + tokens.expiresIn * 1000),
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: new Date(now + tokens.refreshTokenExpiresIn * 1000),
    },
    update: {
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: new Date(now + tokens.expiresIn * 1000),
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: new Date(now + tokens.refreshTokenExpiresIn * 1000),
      // A successful re-seed resolves whatever the reminder cron was
      // warning about.
      reminderSentAt: null,
    },
  });

  return { refreshTokenExpiresInDays: Math.round(tokens.refreshTokenExpiresIn / 86400) };
}

export type PsnProfile = {
  accountId: string;
  onlineId: string;
  avatarUrl: string | null;
  level: number;
  progress: number;
  earnedTrophies: { platinum: number; gold: number; silver: number; bronze: number };
};

// Throws if the username doesn't exist or its trophy data is private —
// callers surface that as "couldn't find/access that profile".
export async function getPsnProfileByUsername(username: string): Promise<PsnProfile> {
  const authorization = await getPsnAuthorization();
  const { profile } = await getProfileFromUserName(authorization, username);
  // Prefer the largest avatar PSN gives us; sizes aren't guaranteed present
  // or ordered, so just take the last one rather than assuming an index.
  const avatarUrl = profile.avatarUrls.at(-1)?.avatarUrl ?? null;
  return {
    accountId: profile.accountId,
    onlineId: profile.onlineId,
    avatarUrl,
    level: profile.trophySummary.level,
    progress: profile.trophySummary.progress,
    earnedTrophies: profile.trophySummary.earnedTrophies,
  };
}

export async function getPsnUserTitles(accountId: string, offset: number, limit: number) {
  const authorization = await getPsnAuthorization();
  return getUserTitles(authorization, accountId, { offset, limit });
}

export async function getPsnTitleTrophyDefinitions(title: Pick<TrophyTitle, "npCommunicationId" | "npServiceName">) {
  const authorization = await getPsnAuthorization();
  return getTitleTrophies(authorization, title.npCommunicationId, "all", {
    npServiceName: title.npServiceName,
  });
}

export async function getPsnUserEarnedTrophies(
  accountId: string,
  title: Pick<TrophyTitle, "npCommunicationId" | "npServiceName">,
) {
  const authorization = await getPsnAuthorization();
  return getUserTrophiesEarnedForTitle(authorization, accountId, title.npCommunicationId, "all", {
    npServiceName: title.npServiceName,
  });
}
