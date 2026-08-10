import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Games search can trigger IGDB/RAWG API calls — kept tighter than other
// endpoints since those round trips cost real quota, not just DB load.
export const searchRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "ratelimit:search",
});

// Everything else worth guarding against spam/scraping (follow/like toggles,
// player search) — all local DB work, so a looser budget is fine.
export const standardRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "ratelimit:standard",
});

// Each Steam library sync page can trigger a batch of IGDB round trips —
// tighter than standard, but loose enough for the client's own chunked
// sync loop (syncPage + syncAchievementsPage share this one bucket) to run
// without self-throttling. A sync of a ~100-game library fires ~11 calls
// across both loops, so the budget needs headroom above that.
export const steamSyncRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(40, "1 m"),
  prefix: "ratelimit:steam-sync",
});

// Same shape as steamSyncRatelimit but its own bucket — PSN sync calls go
// through one shared app-level service token (see PsnServiceToken), so this
// also indirectly protects that single account from being hammered by many
// users syncing at once, not just this app's own DB/IGDB load.
export const psnSyncRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(40, "1 m"),
  prefix: "ratelimit:psn-sync",
});

// OpenXBL's own cap is 150 req/hour for the whole app (one shared API key,
// no per-user quota like Steam). Unlike the per-user limiters above, every
// caller checks the SAME identifier ("global") — see checkXboxBudget in
// src/server/xbox/client.ts, which every actual OpenXBL call goes through.
// Capped below the real limit to leave headroom for the gamertag-search
// preview and any manual/admin calls.
export const xboxGlobalRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(130, "1 h"),
  prefix: "ratelimit:xbox-global",
});

// Per-user tRPC-layer guard on top of xboxGlobalRatelimit — protects against
// one user's client retrying in a tight loop eating the shared budget alone,
// same role steamSyncRatelimit/psnSyncRatelimit play for their providers.
export const xboxSyncRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(40, "1 m"),
  prefix: "ratelimit:xbox-sync",
});
