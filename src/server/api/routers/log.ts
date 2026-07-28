import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const GameStatus = z.enum(["BACKLOG", "PLAYING", "COMPLETED", "DROPPED", "WISHLIST"]);

export const logRouter = createTRPCRouter({
  upsert: protectedProcedure
    .input(
      z.object({
        gameId: z.string(),
        status: GameStatus,
        rating: z.number().min(0).max(10).optional(),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const rating = input.rating !== undefined ? Math.round(input.rating * 10) / 10 : undefined;
      return ctx.prisma.log.upsert({
        where: { userId_gameId: { userId, gameId: input.gameId } },
        create: { userId, ...input, rating },
        update: {
          status: input.status,
          rating,
          notes: input.notes,
        },
      });
    }),

  listForUser: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.log.findMany({
      where: { userId: ctx.session.user.id },
      include: { game: true },
      orderBy: { updatedAt: "desc" },
    });
  }),

  getForGame: protectedProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.log.findUnique({
        where: { userId_gameId: { userId: ctx.session.user.id, gameId: input.gameId } },
      });
    }),
});
