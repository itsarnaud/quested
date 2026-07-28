import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const likeRouter = createTRPCRouter({
  toggle: protectedProcedure
    .input(z.object({ logId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const log = await ctx.prisma.log.findUnique({
        where: { id: input.logId },
        select: { userId: true },
      });
      if (!log) throw new TRPCError({ code: "NOT_FOUND" });
      if (log.userId === ctx.session.user.id) throw new TRPCError({ code: "BAD_REQUEST" });

      const existing = await ctx.prisma.like.findUnique({
        where: { userId_logId: { userId: ctx.session.user.id, logId: input.logId } },
      });

      if (existing) {
        await ctx.prisma.like.delete({ where: { id: existing.id } });
        return { liked: false };
      }

      await ctx.prisma.like.create({
        data: { userId: ctx.session.user.id, logId: input.logId },
      });
      await ctx.prisma.notification.create({
        data: { userId: log.userId, actorId: ctx.session.user.id, type: "LIKE", logId: input.logId },
      });
      return { liked: true };
    }),
});
