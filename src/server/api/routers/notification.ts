import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const notificationRouter = createTRPCRouter({
  // Powers the mobile header's quick-glance dropdown — unread only, since the
  // full history (read or not) already lives on the /notifications page.
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.notification.findMany({
      where: { userId: ctx.session.user.id, read: false },
      include: {
        actor: { select: { username: true, name: true, image: true } },
        log: { select: { game: { select: { slug: true, title: true } } } },
        game: { select: { slug: true, title: true, coverUrl: true } },
      },
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
