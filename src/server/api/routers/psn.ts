import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, withRateLimit } from "@/server/api/trpc";
import {
  getPsnProfileByUsername,
  getPsnUserTitles,
  PsnNotConfiguredError,
  PsnRefreshExpiredError,
} from "@/server/psn/client";
import { syncPsnLibraryPage } from "@/server/psn/sync";
import { syncPsnAchievementsPage } from "@/server/psn/achievements";
import { standardRatelimit, psnSyncRatelimit } from "@/lib/redis";
import { prisma as prismaClient } from "@/lib/prisma";

async function getLinkedPsnAccountId(userId: string) {
  const account = await prismaClient.account.findFirst({
    where: { userId, provider: "psn" },
    select: { providerAccountId: true },
  });
  if (!account) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No PSN account linked." });
  }
  return account.providerAccountId;
}

// Shared by preview and link: resolves a username through the app's service
// token, translating a missing/expired service token into a distinct error
// from a genuinely bad username (see the error-handling note on `link`).
async function resolvePsnProfile(username: string) {
  try {
    return await getPsnProfileByUsername(username);
  } catch (err) {
    if (err instanceof PsnNotConfiguredError || err instanceof PsnRefreshExpiredError) {
      console.error("PSN lookup failed — service token issue:", err.message);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "PSN isn't configured right now." });
    }
    throw new TRPCError({ code: "NOT_FOUND", message: "Couldn't find that PSN profile." });
  }
}

export const psnRouter = createTRPCRouter({
  // Lets the client show "is this you?" (avatar, online ID, trophy count)
  // before actually linking — doesn't touch the database.
  preview: protectedProcedure
    .use(withRateLimit(standardRatelimit))
    .input(z.object({ username: z.string().trim().min(3).max(16) }))
    .mutation(async ({ input }) => {
      const profile = await resolvePsnProfile(input.username);
      const { totalItemCount } = await getPsnUserTitles(profile.accountId, 0, 1);
      return { ...profile, gamesCount: totalItemCount };
    }),

  // Unlike Steam/Google/Discord, PSN has no OAuth redirect to land the
  // "linked" state — this just resolves the given public username to a
  // PSN accountId (through the app's single service token) and stores that
  // as a normal `Account` row, so the rest of the app (unlink, privacy
  // toggle, "linked accounts" list) treats it exactly like the others.
  link: protectedProcedure
    .use(withRateLimit(standardRatelimit))
    .input(z.object({ username: z.string().trim().min(3).max(16) }))
    .mutation(async ({ ctx, input }) => {
      const profile = await resolvePsnProfile(input.username);

      const existing = await ctx.prisma.account.findUnique({
        where: { provider_providerAccountId: { provider: "psn", providerAccountId: profile.accountId } },
      });
      if (existing && existing.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "CONFLICT", message: "This PSN account is already linked to another user." });
      }

      await ctx.prisma.account.upsert({
        where: { provider_providerAccountId: { provider: "psn", providerAccountId: profile.accountId } },
        update: { providerLabel: profile.onlineId },
        create: {
          userId: ctx.session.user.id,
          type: "psn",
          provider: "psn",
          providerAccountId: profile.accountId,
          providerLabel: profile.onlineId,
        },
      });

      return { success: true };
    }),

  getLibrarySize: protectedProcedure.query(async ({ ctx }) => {
    const accountId = await getLinkedPsnAccountId(ctx.session.user.id);
    try {
      const { totalItemCount } = await getPsnUserTitles(accountId, 0, 1);
      return { total: totalItemCount, isPrivate: false };
    } catch (err) {
      // Same distinction as resolvePsnProfile: a missing/expired service
      // token is a config problem, not the user's profile being private —
      // telling them to "make your profile public" would send them on a
      // wild goose chase for something that isn't the actual issue.
      if (err instanceof PsnNotConfiguredError || err instanceof PsnRefreshExpiredError) {
        console.error("PSN getLibrarySize failed — service token issue:", err.message);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "PSN isn't configured right now." });
      }
      // PSN doesn't return a distinguishable "private" error, just a fetch
      // failure — treated the same as Steam's isPrivate case so the client
      // shows one consistent "can't read your library" message either way.
      return { total: 0, isPrivate: true };
    }
  }),

  syncPage: protectedProcedure
    .use(withRateLimit(psnSyncRatelimit))
    .input(z.object({ offset: z.number().int().min(0), limit: z.number().int().min(1).max(100).default(40) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const accountId = await getLinkedPsnAccountId(userId);
      try {
        return await syncPsnLibraryPage(userId, accountId, input.offset, input.limit);
      } catch (err) {
        // A transient PSN/IGDB hiccup mid-page shouldn't surface as a raw
        // 500 — the client's sync loop already treats any thrown error the
        // same way (stop, show one generic toast), so a clean TRPCError is
        // strictly better than an unhandled exception either way.
        console.error("PSN library sync page failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "PSN sync failed." });
      }
    }),

  getTrackedGameCount: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.log.count({
      where: { userId: ctx.session.user.id, game: { externalIds: { some: { source: "PSN" } } } },
    });
  }),

  syncAchievementsPage: protectedProcedure
    .use(withRateLimit(psnSyncRatelimit))
    .input(z.object({ offset: z.number().int().min(0), limit: z.number().int().min(1).max(100).default(5) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const accountId = await getLinkedPsnAccountId(userId);
      try {
        return await syncPsnAchievementsPage(userId, accountId, input.offset, input.limit);
      } catch (err) {
        console.error("PSN achievements sync page failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "PSN sync failed." });
      }
    }),
});
