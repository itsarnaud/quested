import { createTRPCRouter } from "@/server/api/trpc";
import { gameRouter } from "@/server/api/routers/game";
import { logRouter } from "@/server/api/routers/log";
import { userRouter } from "@/server/api/routers/user";
import { followRouter } from "@/server/api/routers/follow";
import { notificationRouter } from "@/server/api/routers/notification";
import { likeRouter } from "@/server/api/routers/like";
import { gameListRouter } from "@/server/api/routers/gameList";
import { pushSubscriptionRouter } from "@/server/api/routers/pushSubscription";
import { steamRouter } from "@/server/api/routers/steam";
import { psnRouter } from "@/server/api/routers/psn";
import { adminRouter } from "@/server/api/routers/admin";

export const appRouter = createTRPCRouter({
  game: gameRouter,
  log: logRouter,
  user: userRouter,
  follow: followRouter,
  notification: notificationRouter,
  like: likeRouter,
  gameList: gameListRouter,
  pushSubscription: pushSubscriptionRouter,
  steam: steamRouter,
  psn: psnRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
