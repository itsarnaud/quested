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
