import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, withRateLimit } from "@/server/api/trpc";
import { standardRatelimit } from "@/lib/redis";
import { sendEmail } from "@/lib/mailer";
import { renderLikeEmail } from "@/lib/email-templates";
import { sendPushToUser } from "@/lib/push";

export const likeRouter = createTRPCRouter({
  toggle: protectedProcedure
    .use(withRateLimit(standardRatelimit))
    .input(z.object({ logId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const log = await ctx.prisma.log.findUnique({
        where: { id: input.logId },
        select: {
          userId: true,
          notes: true,
          game: { select: { title: true, slug: true } },
          user: { select: { email: true, emailOnLike: true } },
        },
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

      if (log.user.emailOnLike && log.user.email && log.notes && ctx.session.user.username) {
        const { subject, html } = renderLikeEmail({
          actorUsername: ctx.session.user.username,
          gameTitle: log.game.title,
          gameSlug: log.game.slug,
          reviewSnippet: log.notes,
        });
        sendEmail({ to: log.user.email, subject, html }).catch((err) =>
          console.error("Failed to send like email:", err),
        );
      }

      if (ctx.session.user.username) {
        sendPushToUser(log.userId, {
          title: "Quested",
          body: `@${ctx.session.user.username} a aimé ton avis sur ${log.game.title}`,
          url: `/games/${log.game.slug}`,
        }).catch((err) => console.error("Failed to send like push:", err));
      }

      return { liked: true };
    }),
});
