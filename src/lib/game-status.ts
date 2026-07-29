import type { GameStatus } from "@/generated/prisma/client";

export const STATUS_SLUGS: Record<GameStatus, string> = {
  BACKLOG: "backlog",
  PLAYING: "playing",
  COMPLETED: "completed",
  DROPPED: "dropped",
  WISHLIST: "wishlist",
};

const SLUG_TO_STATUS = Object.fromEntries(
  Object.entries(STATUS_SLUGS).map(([status, slug]) => [slug, status as GameStatus]),
) as Record<string, GameStatus>;

export function statusFromSlug(slug: string): GameStatus | null {
  return SLUG_TO_STATUS[slug] ?? null;
}
