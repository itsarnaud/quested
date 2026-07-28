import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const gameRouter = createTRPCRouter({
  search: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.game.findMany({
        where: { title: { contains: input.query, mode: "insensitive" } },
        take: 20,
      });
    }),
});
