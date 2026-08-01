import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export async function AchievementsSection({ gameId, userId }: { gameId: string; userId?: string }) {
  const achievements = await prisma.achievement.findMany({
    where: { gameId },
    include: { unlockedBy: { where: { userId: userId ?? "" } } },
    orderBy: { displayName: "asc" },
  });
  if (achievements.length === 0) return null;

  const t = await getTranslations("GamePage");
  const unlockedCount = achievements.filter((a) => a.unlockedBy.length > 0).length;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-bold tracking-tight">
        {t("achievementsTitle")}{" "}
        <span className="text-sm font-normal text-muted-foreground">
          {unlockedCount}/{achievements.length}
        </span>
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {achievements.map((achievement) => {
          const unlocked = achievement.unlockedBy.length > 0;
          return (
            <div
              key={achievement.id}
              className={cn(
                "flex items-center gap-3 rounded-md border border-border p-3",
                !unlocked && "opacity-50",
              )}
            >
              <Image
                src={unlocked ? achievement.iconUrl : achievement.iconGrayUrl}
                alt=""
                width={40}
                height={40}
                unoptimized
                className="size-10 shrink-0 rounded"
              />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{achievement.displayName}</span>
                {achievement.description ? (
                  <span className="truncate text-xs text-muted-foreground">{achievement.description}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
