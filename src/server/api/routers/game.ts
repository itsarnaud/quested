import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { searchIgdbGames } from "@/server/igdb/client";
import { upsertGameFromIgdb } from "@/server/igdb/sync";

export const gameRouter = createTRPCRouter({
  search: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const igdbResults = await searchIgdbGames(input.query);
      const games = await Promise.all(igdbResults.map(upsertGameFromIgdb));

      // de-dupe in case several IGDB results matched the same canonical Game
      return Array.from(new Map(games.map((g) => [g.id, g])).values());
    }),
});
