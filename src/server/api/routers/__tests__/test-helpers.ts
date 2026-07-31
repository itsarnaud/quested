import { appRouter } from "@/server/api/root";
import { prisma } from "@/lib/prisma";

export function callerAs(user: { id: string; username?: string | null } | null) {
  const session = user ? { user: { id: user.id, username: user.username ?? null }, expires: "" } : null;
  return appRouter.createCaller({ session, prisma, ip: "test" });
}
