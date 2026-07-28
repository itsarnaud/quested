import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { prisma } from "@/lib/prisma";

async function withFollowingFlag<T extends { id: string }>(
  sessionUserId: string | undefined,
  users: T[],
) {
  const followingIds = sessionUserId
    ? new Set(
        (
          await prisma.follow.findMany({
            where: { followerId: sessionUserId, followingId: { in: users.map((u) => u.id) } },
            select: { followingId: true },
          })
        ).map((f) => f.followingId),
      )
    : new Set<string>();

  return users.map((u) => ({ ...u, isFollowing: followingIds.has(u.id) }));
}

export const userRouter = createTRPCRouter({
  search: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const users = await ctx.prisma.user.findMany({
        where: {
          username: { not: null },
          id: ctx.session?.user ? { not: ctx.session.user.id } : undefined,
          OR: [
            { username: { contains: input.query, mode: "insensitive" } },
            { name: { contains: input.query, mode: "insensitive" } },
          ],
        },
        select: { id: true, username: true, name: true, image: true, bio: true },
        take: 20,
      });

      return withFollowingFlag(ctx.session?.user?.id, users);
    }),

  // Newest joined players — shown as a fallback when there aren't enough
  // mutual connections yet to compute suggestions.
  recent: publicProcedure.query(async ({ ctx }) => {
    const users = await ctx.prisma.user.findMany({
      where: {
        username: { not: null },
        id: ctx.session?.user ? { not: ctx.session.user.id } : undefined,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, username: true, name: true, image: true, bio: true },
      take: 12,
    });

    return withFollowingFlag(ctx.session?.user?.id, users);
  }),

  // Players followed by the people you follow, ranked by how many of your
  // follows also follow them — classic "people you may know".
  suggestions: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;
    if (!userId) return [];

    const following = await ctx.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);
    if (followingIds.length === 0) return [];

    const mutuals = await ctx.prisma.follow.groupBy({
      by: ["followingId"],
      where: {
        followerId: { in: followingIds },
        followingId: { notIn: [...followingIds, userId] },
      },
      _count: { followingId: true },
      orderBy: { _count: { followingId: "desc" } },
      take: 12,
    });
    if (mutuals.length === 0) return [];

    const mutualCountById = new Map(mutuals.map((m) => [m.followingId, m._count.followingId]));
    const users = await ctx.prisma.user.findMany({
      where: { id: { in: [...mutualCountById.keys()] }, username: { not: null } },
      select: { id: true, username: true, name: true, image: true, bio: true },
    });
    users.sort(
      (a, b) => (mutualCountById.get(b.id) ?? 0) - (mutualCountById.get(a.id) ?? 0),
    );

    return users.map((u) => ({ ...u, isFollowing: false, mutualCount: mutualCountById.get(u.id) ?? 0 }));
  }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.session.user.id },
      select: { name: true, username: true, bio: true, image: true },
    });
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(50),
        username: z
          .string()
          .trim()
          .toLowerCase()
          .min(3)
          .max(20)
          .regex(/^[a-z0-9-]+$/),
        bio: z.string().trim().max(280).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({
        where: { username: input.username },
      });
      if (existing && existing.id !== ctx.session.user.id) {
        throw new TRPCError({ code: "CONFLICT" });
      }

      return ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: {
          name: input.name,
          username: input.username,
          bio: input.bio || null,
        },
      });
    }),

  exportData: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.session.user.id },
      include: {
        logs: {
          include: { game: { select: { title: true, slug: true, releaseYear: true } } },
        },
      },
    });

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt,
      logs: user.logs.map((log) => ({
        game: log.game.title,
        slug: log.game.slug,
        releaseYear: log.game.releaseYear,
        status: log.status,
        rating: log.rating,
        notes: log.notes,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
      })),
    };
  }),

  // GDPR right to erasure. Account/Session/Log all cascade on delete via the schema.
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.user.delete({ where: { id: ctx.session.user.id } });
    return { success: true };
  }),
});
