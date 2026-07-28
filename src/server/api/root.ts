import { createTRPCRouter } from "@/server/api/trpc";
import { gameRouter } from "@/server/api/routers/game";
import { logRouter } from "@/server/api/routers/log";
import { userRouter } from "@/server/api/routers/user";
import { followRouter } from "@/server/api/routers/follow";
import { notificationRouter } from "@/server/api/routers/notification";
import { likeRouter } from "@/server/api/routers/like";

export const appRouter = createTRPCRouter({
  game: gameRouter,
  log: logRouter,
  user: userRouter,
  follow: followRouter,
  notification: notificationRouter,
  like: likeRouter,
});

export type AppRouter = typeof appRouter;
