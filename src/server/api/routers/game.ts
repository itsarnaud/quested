import { z } from "zod";
import { createTRPCRouter, publicProcedure, withRateLimit } from "@/server/api/trpc";
import { searchIgdbGames } from "@/server/igdb/client";
import { upsertGameFromIgdb } from "@/server/igdb/sync";
import { searchRawgGames } from "@/server/rawg/client";
import { upsertGameFromRawg } from "@/server/rawg/sync";
import { searchRatelimit } from "@/lib/redis";

// Below this many local matches, we assume the catalog doesn't know this
// title yet and it's worth paying the IGDB/RAWG round trip. Above it,
// the local DB already has enough to show and we skip the external calls
// entirely — this is what makes repeat searches fast.
const LOCAL_RESULTS_THRESHOLD = 8;

export const gameRouter = createTRPCRouter({
  search: publicProcedure
    .use(withRateLimit(searchRatelimit))
    .input(
      z.object({
        query: z.string(),
        genre: z.string().optional(),
        platform: z.string().optional(),
        year: z.number().int().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const hasFilters = Boolean(input.genre || input.platform || input.year);
      const hasQuery = input.query.trim().length > 0;

      // With filters active, browse the local catalog only — filters are
      // structured data we only have for games already imported, so an
      // external API round trip wouldn't respect them anyway.
      if (hasFilters) {
        return ctx.prisma.game.findMany({
          where: {
            title: hasQuery ? { contains: input.query, mode: "insensitive" } : undefined,
            genres: input.genre ? { has: input.genre } : undefined,
            platforms: input.platform ? { has: input.platform } : undefined,
            releaseYear: input.year,
          },
          orderBy: { logs: { _count: "desc" } },
          take: 24,
        });
      }

      if (!hasQuery) return [];

      const localGames = await ctx.prisma.game.findMany({
        where: { title: { contains: input.query, mode: "insensitive" } },
        take: 20,
      });

      if (localGames.length >= LOCAL_RESULTS_THRESHOLD) {
        return localGames;
      }

      const [igdbResults, rawgResults] = await Promise.all([
        searchIgdbGames(input.query),
        searchRawgGames(input.query),
      ]);

      // IGDB upserts run first and are fully awaited so RAWG's
      // title+year matching can dedupe against games IGDB already created.
      const igdbGames = await Promise.all(igdbResults.map(upsertGameFromIgdb));
      const rawgGames = await Promise.all(rawgResults.map(upsertGameFromRawg));

      return Array.from(
        new Map([...localGames, ...igdbGames, ...rawgGames].map((g) => [g.id, g])).values(),
      );
    }),

  // "Because you're searching X" discovery row: other popular games sharing
  // a genre with the best local match for the query, e.g. searching
  // "Valorant" surfaces CS2/Overwatch alongside the direct title matches.
  relatedSuggestions: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      if (input.query.trim().length < 2) return null;

      const match = await ctx.prisma.game.findFirst({
        where: { title: { contains: input.query, mode: "insensitive" } },
        orderBy: { logs: { _count: "desc" } },
      });
      if (!match || match.genres.length === 0) return null;

      const games = await ctx.prisma.game.findMany({
        where: {
          id: { not: match.id },
          genres: { hasSome: match.genres },
          // Exclude anything that would already show up in the direct
          // title-match results, so this surfaces genuinely different games.
          NOT: { title: { contains: input.query, mode: "insensitive" } },
        },
        orderBy: { logs: { _count: "desc" } },
        take: 6,
      });
      if (games.length === 0) return null;

      return { basedOnTitle: match.title, games };
    }),

  filterOptions: publicProcedure.query(async ({ ctx }) => {
    const [genres, platforms, years] = await Promise.all([
      ctx.prisma.$queryRaw<{ value: string }[]>`
        SELECT DISTINCT unnest(genres) AS value FROM "Game" ORDER BY value
      `,
      ctx.prisma.$queryRaw<{ value: string }[]>`
        SELECT DISTINCT unnest(platforms) AS value FROM "Game" ORDER BY value
      `,
      ctx.prisma.$queryRaw<{ value: number }[]>`
        SELECT DISTINCT "releaseYear" AS value FROM "Game"
        WHERE "releaseYear" IS NOT NULL ORDER BY value DESC
      `,
    ]);

    return {
      genres: genres.map((g) => g.value),
      platforms: platforms.map((p) => p.value),
      years: years.map((y) => y.value),
    };
  }),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.game.findUnique({ where: { slug: input.slug } });
    }),

  popular: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.game.findMany({
      orderBy: { logs: { _count: "desc" } },
      take: 16,
    });
  }),
});
