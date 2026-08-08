import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { seedPsnServiceToken } from "@/server/psn/client";

// Single-admin app: the only "admin" is whoever's email matches the alert
// inbox already used for crash notifications — no separate roles/permissions
// system exists (or is needed) for a solo-dev project.
function assertIsAdmin(email: string | null | undefined) {
  if (!email || email !== process.env.ALERT_EMAIL_TO) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

export const adminRouter = createTRPCRouter({
  getPsnTokenStatus: protectedProcedure.query(async ({ ctx }) => {
    assertIsAdmin(ctx.session.user.email);
    const token = await ctx.prisma.psnServiceToken.findUnique({ where: { id: "singleton" } });
    if (!token) return null;
    return { refreshTokenExpiresAt: token.refreshTokenExpiresAt };
  }),

  setPsnToken: protectedProcedure
    .input(z.object({ npsso: z.string().trim().min(10) }))
    .mutation(async ({ ctx, input }) => {
      assertIsAdmin(ctx.session.user.email);
      try {
        return await seedPsnServiceToken(input.npsso);
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Couldn't exchange that NPSSO — it may be stale." });
      }
    }),
});
