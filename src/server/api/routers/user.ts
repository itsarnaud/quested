import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const userRouter = createTRPCRouter({
  exportData: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.session.user.id },
      include: {
        logs: {
          include: { game: { select: { title: true, slug: true, releaseYear: true } } },
        },
      },
    });

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt,
      logs: user.logs.map((log) => ({
        game: log.game.title,
        slug: log.game.slug,
        releaseYear: log.game.releaseYear,
        status: log.status,
        rating: log.rating,
        notes: log.notes,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
      })),
    };
  }),

  // GDPR right to erasure. Account/Session/Log all cascade on delete via the schema.
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.user.delete({ where: { id: ctx.session.user.id } });
    return { success: true };
  }),
});
