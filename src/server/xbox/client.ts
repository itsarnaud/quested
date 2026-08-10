// OpenXBL (xbl.io) — unlike PSN's psn-api, this is a plain REST API behind
// one static app-level key (X-Authorization header), no OAuth token
// exchange/refresh dance. If the key turns out to expire in practice, this
// is the one place to add a PSN-style reseed/reminder flow.
import { xboxGlobalRatelimit } from "@/lib/redis";

const BASE_URL = "https://xbl.io/api/v2";

export class XboxNotConfiguredError extends Error {
  constructor() {
    super("No OPENXBL_API_KEY configured.");
    this.name = "XboxNotConfiguredError";
  }
}

// Thrown when OpenXBL's own 150 req/hour cap is hit — distinct from
// Quested's own rate limiter (see xboxGlobalRatelimit in src/lib/redis.ts),
// which exists specifically to stay under this before OpenXBL ever sees it.
export class XboxRateLimitedError extends Error {
  constructor() {
    super("OpenXBL rate limit hit (429).");
    this.name = "XboxRateLimitedError";
  }
}

// Thrown by checkXboxBudget before a request is even attempted — Quested's
// own global counter is already at capacity for this hour. resetAt is when
// the sliding window frees up enough room to try again.
export class XboxBudgetExhaustedError extends Error {
  resetAt: number;
  constructor(resetAt: number) {
    super("Xbox sync budget exhausted for this hour.");
    this.name = "XboxBudgetExhaustedError";
    this.resetAt = resetAt;
  }
}

// Every OpenXBL call — library or achievements, any user — goes through
// this one shared counter first, so no single sync (or two overlapping
// ones) can blow through OpenXBL's real 150/hour cap. Call sites that hit
// this mid-sync should pause and resume once resetAt passes, not just fail.
async function checkXboxBudget(): Promise<void> {
  const { success, reset } = await xboxGlobalRatelimit.limit("global");
  if (!success) throw new XboxBudgetExhaustedError(reset);
}

async function xboxFetch<T>(path: string): Promise<T> {
  const apiKey = process.env.OPENXBL_API_KEY;
  if (!apiKey) throw new XboxNotConfiguredError();

  await checkXboxBudget();

  const res = await fetch(`${BASE_URL}${path}`, {
    // Accept-Language is required: Node's fetch defaults to "*", which the
    // Xbox Live infra behind OpenXBL rejects outright (no such issue over
    // curl, which sends no Accept-Language at all — cost real debugging
    // time to track down).
    headers: { "X-Authorization": apiKey, Accept: "application/json", "Accept-Language": "en-US" },
  });
  if (res.status === 429) throw new XboxRateLimitedError();
  if (!res.ok) throw new Error(`OpenXBL request failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { content: T };
  return data.content;
}

export type XboxProfile = {
  xuid: string;
  gamertag: string;
  gamerScore: string;
  avatarUrl: string | null;
  accountTier: string;
};

// Throws if the gamertag doesn't exist. OpenXBL's search returns close
// matches too, not just an exact hit — take the first result whose
// gamertag matches exactly (case-insensitive), same "don't guess" spirit
// as PSN's exact-username lookup.
export async function getXboxProfileByGamertag(gamertag: string): Promise<XboxProfile> {
  const { people } = await xboxFetch<{ people: XboxProfileSearchResult[] }>(
    `/search/${encodeURIComponent(gamertag)}`,
  );
  const match = people.find((p) => p.gamertag.toLowerCase() === gamertag.toLowerCase());
  if (!match) throw new Error("Xbox gamertag not found.");

  return {
    xuid: match.xuid,
    gamertag: match.gamertag,
    gamerScore: match.gamerScore,
    avatarUrl: match.displayPicRaw ?? null,
    accountTier: match.detail?.accountTier ?? "Silver",
  };
}

type XboxProfileSearchResult = {
  xuid: string;
  gamertag: string;
  gamerScore: string;
  displayPicRaw: string | null;
  detail: { accountTier: string } | null;
};

export type XboxTitle = {
  titleId: string;
  name: string;
  displayImage: string | null;
  devices: string[];
  achievement: { currentAchievements: number; totalAchievements: number; progressPercentage: number } | null;
};

// One call, no pagination — OpenXBL returns the full played-titles history
// in a single response (verified against a real ~40-game account).
export async function getXboxTitleHistory(xuid: string): Promise<XboxTitle[]> {
  const { titles } = await xboxFetch<{ titles: XboxTitle[] }>(`/player/titleHistory/${xuid}`);
  return titles;
}

export type XboxAchievement = {
  id: string;
  name: string;
  description: string;
  mediaAssets: { type: string; url: string }[];
  progressState: "Achieved" | "NotStarted" | "InProgress";
  progression: { timeUnlocked: string };
  rarity: { currentCategory: string; currentPercentage: number } | null;
  rewards: { type: string; value: string }[];
};

// One call per game, no separate "definitions" vs "earned status" split
// like Steam/PSN — OpenXBL returns the full achievement list (locked and
// unlocked, each with its own rarity) for the title in one response.
export async function getXboxTitleAchievements(xuid: string, titleId: string): Promise<XboxAchievement[]> {
  const data = await xboxFetch<{ achievements: XboxAchievement[] }>(`/achievements/player/${xuid}/${titleId}`);
  return data.achievements;
}
