import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const pushSubscriptionRouter = createTRPCRouter({
  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        keys: z.object({ p256dh: z.string(), auth: z.string() }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.pushSubscription.upsert({
        where: { endpoint: input.endpoint },
        update: { userId: ctx.session.user.id, p256dh: input.keys.p256dh, auth: input.keys.auth },
        create: {
          userId: ctx.session.user.id,
          endpoint: input.endpoint,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
        },
      });
      return { success: true };
    }),

  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.pushSubscription.deleteMany({
        where: { endpoint: input.endpoint, userId: ctx.session.user.id },
      });
      return { success: true };
    }),

  isSubscribed: protectedProcedure
    .input(z.object({ endpoint: z.string().url() }))
    .query(async ({ ctx, input }) => {
      const sub = await ctx.prisma.pushSubscription.findUnique({ where: { endpoint: input.endpoint } });
      return Boolean(sub && sub.userId === ctx.session.user.id);
    }),
});
