import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const GameStatus = z.enum(["BACKLOG", "PLAYING", "COMPLETED", "DROPPED", "WISHLIST"]);

export const logRouter = createTRPCRouter({
  upsert: protectedProcedure
    .input(
      z.object({
        gameId: z.string(),
        status: GameStatus,
        rating: z.number().int().min(1).max(10).optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.prisma.log.upsert({
        where: { userId_gameId: { userId, gameId: input.gameId } },
        create: { userId, ...input },
        update: {
          status: input.status,
          rating: input.rating,
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
