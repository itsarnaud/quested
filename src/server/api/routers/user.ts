import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";

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

      const followingIds = ctx.session?.user
        ? new Set(
            (
              await ctx.prisma.follow.findMany({
                where: {
                  followerId: ctx.session.user.id,
                  followingId: { in: users.map((u) => u.id) },
                },
                select: { followingId: true },
              })
            ).map((f) => f.followingId),
          )
        : new Set<string>();

      return users.map((u) => ({ ...u, isFollowing: followingIds.has(u.id) }));
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
