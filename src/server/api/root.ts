import { createTRPCRouter } from "@/server/api/trpc";
import { gameRouter } from "@/server/api/routers/game";
import { logRouter } from "@/server/api/routers/log";

export const appRouter = createTRPCRouter({
  game: gameRouter,
  log: logRouter,
});

export type AppRouter = typeof appRouter;
