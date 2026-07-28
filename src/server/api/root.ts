import { createTRPCRouter } from "@/server/api/trpc";
import { gameRouter } from "@/server/api/routers/game";
import { logRouter } from "@/server/api/routers/log";
import { userRouter } from "@/server/api/routers/user";

export const appRouter = createTRPCRouter({
  game: gameRouter,
  log: logRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
