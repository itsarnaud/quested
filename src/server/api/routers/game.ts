import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { searchIgdbGames } from "@/server/igdb/client";
import { upsertGameFromIgdb } from "@/server/igdb/sync";
import { searchRawgGames } from "@/server/rawg/client";
import { upsertGameFromRawg } from "@/server/rawg/sync";

// Below this many local matches, we assume the catalog doesn't know this
// title yet and it's worth paying the IGDB/RAWG round trip. Above it,
// the local DB already has enough to show and we skip the external calls
// entirely — this is what makes repeat searches fast.
const LOCAL_RESULTS_THRESHOLD = 8;

export const gameRouter = createTRPCRouter({
  search: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
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

  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.game.findUnique({ where: { slug: input.slug } });
    }),

  popular: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.game.findMany({
      orderBy: { logs: { _count: "desc" } },
      take: 12,
    });
  }),
});
