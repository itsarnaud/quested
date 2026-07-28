import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  withRateLimit,
} from "@/server/api/trpc";
import { standardRatelimit } from "@/lib/redis";

const MAX_LISTS_PER_USER = 25;

async function requireOwnedList(prisma: PrismaClient, listId: string, userId: string) {
  const list = await prisma.gameList.findUnique({ where: { id: listId } });
  if (!list) throw new TRPCError({ code: "NOT_FOUND" });
  if (list.userId !== userId) throw new TRPCError({ code: "FORBIDDEN" });
  return list;
}

export const gameListRouter = createTRPCRouter({
  byUser: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { username: input.username },
        select: { id: true },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const lists = await ctx.prisma.gameList.findMany({
        where: { userId: user.id },
        include: { items: { include: { game: true }, orderBy: { position: "asc" }, take: 6 } },
        orderBy: { updatedAt: "desc" },
      });

      const counts = await ctx.prisma.gameListItem.groupBy({
        by: ["listId"],
        where: { listId: { in: lists.map((l) => l.id) } },
        _count: { listId: true },
      });
      const countByListId = new Map(counts.map((c) => [c.listId, c._count.listId]));

      return lists.map((list) => ({
        id: list.id,
        title: list.title,
        description: list.description,
        itemCount: countByListId.get(list.id) ?? 0,
        preview: list.items.map((item) => item.game),
      }));
    }),

  get: publicProcedure.input(z.object({ listId: z.string() })).query(async ({ ctx, input }) => {
    const list = await ctx.prisma.gameList.findUnique({
      where: { id: input.listId },
      include: {
        user: { select: { username: true, name: true } },
        items: { include: { game: true }, orderBy: { position: "asc" } },
      },
    });
    if (!list) throw new TRPCError({ code: "NOT_FOUND" });
    return list;
  }),

  create: protectedProcedure
    .use(withRateLimit(standardRatelimit))
    .input(z.object({ title: z.string().trim().min(1).max(80), description: z.string().trim().max(280).optional() }))
    .mutation(async ({ ctx, input }) => {
      const existingCount = await ctx.prisma.gameList.count({ where: { userId: ctx.session.user.id } });
      if (existingCount >= MAX_LISTS_PER_USER) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "List limit reached." });
      }

      return ctx.prisma.gameList.create({
        data: {
          userId: ctx.session.user.id,
          title: input.title,
          description: input.description || null,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        listId: z.string(),
        title: z.string().trim().min(1).max(80),
        description: z.string().trim().max(280).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOwnedList(ctx.prisma, input.listId, ctx.session.user.id);
      return ctx.prisma.gameList.update({
        where: { id: input.listId },
        data: { title: input.title, description: input.description || null },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireOwnedList(ctx.prisma, input.listId, ctx.session.user.id);
      await ctx.prisma.gameList.delete({ where: { id: input.listId } });
      return { success: true };
    }),

  addGame: protectedProcedure
    .use(withRateLimit(standardRatelimit))
    .input(z.object({ listId: z.string(), gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireOwnedList(ctx.prisma, input.listId, ctx.session.user.id);

      const lastItem = await ctx.prisma.gameListItem.findFirst({
        where: { listId: input.listId },
        orderBy: { position: "desc" },
      });
      const position = (lastItem?.position ?? -1) + 1;

      await ctx.prisma.gameListItem.upsert({
        where: { listId_gameId: { listId: input.listId, gameId: input.gameId } },
        update: {},
        create: { listId: input.listId, gameId: input.gameId, position },
      });
      return { success: true };
    }),

  removeGame: protectedProcedure
    .input(z.object({ listId: z.string(), gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireOwnedList(ctx.prisma, input.listId, ctx.session.user.id);
      await ctx.prisma.gameListItem.deleteMany({
        where: { listId: input.listId, gameId: input.gameId },
      });
      return { success: true };
    }),
});
