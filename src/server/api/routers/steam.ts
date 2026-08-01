import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, withRateLimit } from "@/server/api/trpc";
import { prisma } from "@/lib/prisma";
import { getSteamOwnedGames } from "@/lib/steam-auth";
import { syncSteamLibraryPage } from "@/server/steam/sync";
import { steamSyncRatelimit } from "@/lib/redis";

async function getLinkedSteamId(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "steam" },
    select: { providerAccountId: true },
  });
  if (!account) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No Steam account linked." });
  }
  return account.providerAccountId;
}

export const steamRouter = createTRPCRouter({
  getLibrarySize: protectedProcedure.query(async ({ ctx }) => {
    const steamId = await getLinkedSteamId(ctx.session.user.id);
    const games = await getSteamOwnedGames(steamId);
    if (games === null) return { total: 0, isPrivate: true };
    return { total: games.length, isPrivate: false };
  }),

  syncPage: protectedProcedure
    .use(withRateLimit(steamSyncRatelimit))
    .input(z.object({ offset: z.number().int().min(0), limit: z.number().int().min(1).max(100).default(40) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const steamId = await getLinkedSteamId(userId);
      const games = await getSteamOwnedGames(steamId);
      if (games === null) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Steam profile is private." });
      }
      return syncSteamLibraryPage(userId, games, input.offset, input.limit);
    }),
});
