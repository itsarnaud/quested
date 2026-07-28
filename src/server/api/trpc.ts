import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Ratelimit } from "@upstash/ratelimit";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const createTRPCContext = async ({ req }: { req: Request }) => {
  const session = await auth();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return { session, prisma, ip };
};

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

// Keyed by user id when logged in, otherwise by IP — either way the same
// person can't dodge the limit just by signing out.
export function withRateLimit(limiter: Ratelimit) {
  return t.middleware(async ({ ctx, next }) => {
    const identifier = ctx.session?.user?.id ?? `ip:${ctx.ip}`;
    const { success } = await limiter.limit(identifier);
    if (!success) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many requests, slow down a bit." });
    }
    return next();
  });
}
