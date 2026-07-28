import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const notificationRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.notification.findMany({
      where: { userId: ctx.session.user.id },
      include: { actor: { select: { username: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.notification.count({
      where: { userId: ctx.session.user.id, read: false },
    });
  }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.notification.updateMany({
      where: { userId: ctx.session.user.id, read: false },
      data: { read: true },
    });
    return { success: true };
  }),
});
