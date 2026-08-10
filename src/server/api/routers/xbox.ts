import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, withRateLimit } from "@/server/api/trpc";
import {
  getXboxProfileByGamertag,
  getXboxTitleHistory,
  XboxNotConfiguredError,
  XboxBudgetExhaustedError,
} from "@/server/xbox/client";
import { syncXboxLibrary } from "@/server/xbox/sync";
import { syncXboxAchievementsPage } from "@/server/xbox/achievements";
import { standardRatelimit, xboxSyncRatelimit } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

async function getLinkedXuid(userId: string) {
  const account = await prisma.account.findFirst({ where: { userId, provider: "xbox" }, select: { providerAccountId: true } });
  if (!account) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No Xbox account linked." });
  }
  return account.providerAccountId;
}

// Same distinction PSN's router makes: a missing app-level config (or the
// shared OpenXBL budget being exhausted) is a "we messed up / hit our own
// cap" story, not the gamertag being wrong.
async function resolveXboxProfile(gamertag: string) {
  try {
    return await getXboxProfileByGamertag(gamertag);
  } catch (err) {
    if (err instanceof XboxNotConfiguredError) {
      console.error("Xbox lookup failed — not configured:", err.message);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Xbox isn't configured right now." });
    }
    if (err instanceof XboxBudgetExhaustedError) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Xbox sync budget exhausted, try again later." });
    }
    throw new TRPCError({ code: "NOT_FOUND", message: "Couldn't find that Xbox gamertag." });
  }
}

export const xboxRouter = createTRPCRouter({
  preview: protectedProcedure
    .use(withRateLimit(standardRatelimit))
    .input(z.object({ gamertag: z.string().trim().min(3).max(15) }))
    .mutation(async ({ input }) => {
      const profile = await resolveXboxProfile(input.gamertag);
      const titles = await getXboxTitleHistory(profile.xuid).catch(() => []);
      return { ...profile, gamesCount: titles.length };
    }),

  // No OAuth redirect for Xbox either (see PSN's `link` for the same
  // reasoning) — resolves the gamertag to an XUID through the app's
  // OpenXBL key and stores it as a normal `Account` row.
  link: protectedProcedure
    .use(withRateLimit(standardRatelimit))
    .input(z.object({ gamertag: z.string().trim().min(3).max(15) }))
    .mutation(async ({ ctx, input }) => {
      const profile = await resolveXboxProfile(input.gamertag);

      const existing = await ctx.prisma.account.findUnique({
        where: { provider_providerAccountId: { provider: "xbox", providerAccountId: profile.xuid } },
      });
      if (existing && existing.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "CONFLICT", message: "This Xbox account is already linked to another user." });
      }

      await ctx.prisma.account.upsert({
        where: { provider_providerAccountId: { provider: "xbox", providerAccountId: profile.xuid } },
        update: { providerLabel: profile.gamertag },
        create: {
          userId: ctx.session.user.id,
          type: "xbox",
          provider: "xbox",
          providerAccountId: profile.xuid,
          providerLabel: profile.gamertag,
        },
      });

      return { success: true };
    }),

  // Unlike Steam/PSN's getLibrarySize + paginated syncPage, OpenXBL's
  // titleHistory has no pagination at all (see src/server/xbox/sync.ts) —
  // one call imports the whole library, so there's nothing to page over.
  syncLibrary: protectedProcedure.use(withRateLimit(xboxSyncRatelimit)).mutation(async ({ ctx }) => {
    const xuid = await getLinkedXuid(ctx.session.user.id);
    try {
      const result = await syncXboxLibrary(ctx.session.user.id, xuid);
      return { ...result, pausedUntil: null as number | null };
    } catch (err) {
      if (err instanceof XboxBudgetExhaustedError) {
        return { imported: 0, updated: 0, total: 0, pausedUntil: err.resetAt };
      }
      console.error("Xbox library sync failed:", err);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Xbox sync failed." });
    }
  }),

  getTrackedGameCount: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.log.count({
      where: { userId: ctx.session.user.id, game: { externalIds: { some: { source: "XBOX" } } } },
    });
  }),

  syncAchievementsPage: protectedProcedure
    .use(withRateLimit(xboxSyncRatelimit))
    .input(z.object({ offset: z.number().int().min(0), limit: z.number().int().min(1).max(100).default(5) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const xuid = await getLinkedXuid(userId);
      try {
        return await syncXboxAchievementsPage(userId, xuid, input.offset, input.limit);
      } catch (err) {
        console.error("Xbox achievements sync page failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Xbox sync failed." });
      }
    }),
});
