import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { searchIgdbGames } from "@/server/igdb/client";
import { upsertGameFromIgdb } from "@/server/igdb/sync";
import { searchRawgGames } from "@/server/rawg/client";
import { upsertGameFromRawg } from "@/server/rawg/sync";

export const gameRouter = createTRPCRouter({
  search: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const [igdbResults, rawgResults] = await Promise.all([
        searchIgdbGames(input.query),
        searchRawgGames(input.query),
      ]);

      // IGDB upserts run first and are fully awaited so RAWG's
      // title+year matching can dedupe against games IGDB already created.
      const igdbGames = await Promise.all(igdbResults.map(upsertGameFromIgdb));
      const rawgGames = await Promise.all(rawgResults.map(upsertGameFromRawg));

      return Array.from(new Map([...igdbGames, ...rawgGames].map((g) => [g.id, g])).values());
    }),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.game.findUnique({ where: { slug: input.slug } });
    }),
});
