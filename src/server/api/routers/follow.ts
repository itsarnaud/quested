import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure, withRateLimit } from "@/server/api/trpc";
import { standardRatelimit } from "@/lib/redis";
import { sendEmail } from "@/lib/mailer";
import { renderFollowEmail } from "@/lib/email-templates";
import { sendPushToUser } from "@/lib/push";
import { withFollowingFlag } from "@/server/api/routers/user";

const USER_CARD_SELECT = { id: true, username: true, name: true, image: true, badges: true } as const;
const FOLLOW_LIST_LIMIT = 500;

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

      if (ctx.session.user.username) {
        sendPushToUser(target.id, {
          title: "Nouvel abonné",
          body: `@${ctx.session.user.username} a commencé à te suivre`,
          url: `/u/${ctx.session.user.username}`,
        }).catch((err) => console.error("Failed to send follow push:", err));
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

  list: publicProcedure
    .input(z.object({ username: z.string(), type: z.enum(["followers", "following"]) }))
    .query(async ({ ctx, input }) => {
      const target = await ctx.prisma.user.findUnique({
        where: { username: input.username },
        select: { id: true },
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });

      const users = await (input.type === "followers"
        ? ctx.prisma.follow
            .findMany({
              where: { followingId: target.id },
              select: { follower: { select: USER_CARD_SELECT } },
              orderBy: { createdAt: "desc" },
              take: FOLLOW_LIST_LIMIT,
            })
            .then((rows) => rows.map((r) => r.follower))
        : ctx.prisma.follow
            .findMany({
              where: { followerId: target.id },
              select: { following: { select: USER_CARD_SELECT } },
              orderBy: { createdAt: "desc" },
              take: FOLLOW_LIST_LIMIT,
            })
            .then((rows) => rows.map((r) => r.following)));

      return withFollowingFlag(ctx.session?.user?.id, users);
    }),

  mutuals: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const viewerId = ctx.session?.user?.id;
      if (!viewerId) return { count: 0, users: [] };

      const target = await ctx.prisma.user.findUnique({
        where: { username: input.username },
        select: { id: true },
      });
      if (!target || target.id === viewerId) return { count: 0, users: [] };

      const viewerFollowing = await ctx.prisma.follow.findMany({
        where: { followerId: viewerId },
        select: { followingId: true },
      });
      const viewerFollowingIds = viewerFollowing.map((f) => f.followingId);
      if (viewerFollowingIds.length === 0) return { count: 0, users: [] };

      const where = { followingId: target.id, followerId: { in: viewerFollowingIds } };
      const [count, rows] = await Promise.all([
        ctx.prisma.follow.count({ where }),
        ctx.prisma.follow.findMany({
          where,
          select: { follower: { select: USER_CARD_SELECT } },
          take: 3,
        }),
      ]);

      return { count, users: rows.map((r) => r.follower) };
    }),
});
