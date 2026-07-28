import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";

export const followRouter = createTRPCRouter({
  toggle: protectedProcedure
    .input(z.object({ username: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.prisma.user.findUnique({ where: { username: input.username } });
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      if (target.id === ctx.session.user.id) throw new TRPCError({ code: "BAD_REQUEST" });

      const existing = await ctx.prisma.follow.findUnique({
        where: {
          followerId_followingId: { followerId: ctx.session.user.id, followingId: target.id },
        },
      });

      if (existing) {
        await ctx.prisma.follow.delete({ where: { id: existing.id } });
        return { following: false };
      }

      await ctx.prisma.follow.create({
        data: { followerId: ctx.session.user.id, followingId: target.id },
      });
      await ctx.prisma.notification.create({
        data: { userId: target.id, actorId: ctx.session.user.id, type: "FOLLOW" },
      });
      return { following: true };
    }),

  status: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const target = await ctx.prisma.user.findUnique({
        where: { username: input.username },
        select: { id: true, _count: { select: { followers: true, following: true } } },
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });

      const isFollowing = ctx.session?.user
        ? Boolean(
            await ctx.prisma.follow.findUnique({
              where: {
                followerId_followingId: {
                  followerId: ctx.session.user.id,
                  followingId: target.id,
                },
              },
            }),
          )
        : false;

      return {
        followerCount: target._count.followers,
        followingCount: target._count.following,
        isFollowing,
      };
    }),
});
