import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure, withRateLimit } from "@/server/api/trpc";
import { standardRatelimit } from "@/lib/redis";
import { sendEmail } from "@/lib/mailer";
import { renderFollowEmail } from "@/lib/email-templates";

export const followRouter = createTRPCRouter({
  toggle: protectedProcedure
    .use(withRateLimit(standardRatelimit))
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

      if (target.emailOnFollow && target.email && ctx.session.user.username) {
        const { subject, html } = renderFollowEmail({ actorUsername: ctx.session.user.username });
        sendEmail({ to: target.email, subject, html }).catch((err) =>
          console.error("Failed to send follow email:", err),
        );
      }

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
