"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 4;

type CarouselAchievement = {
  id: string;
  displayName: string;
  description: string | null;
  iconUrl: string;
  unlocked: boolean;
  globalUnlockedPercent: number | null;
};

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}

export function AchievementsCarousel({ achievements }: { achievements: CarouselAchievement[] }) {
  const [page, setPage] = useState(0);
  const pages = chunk(achievements, PAGE_SIZE);
  const pageCount = pages.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${page * 100}%)` }}
        >
          {pages.map((pageItems, i) => (
            <div key={i} className="grid w-full shrink-0 gap-2 sm:grid-cols-2 sm:grid-rows-2">
              {pageItems.map((achievement) => (
                <div
                  key={achievement.id}
                  className={cn(
                    "flex items-center gap-3 rounded-md border border-border p-3",
                    !achievement.unlocked && "opacity-50",
                  )}
                >
                  <Image
                    src={achievement.iconUrl}
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
                    {achievement.globalUnlockedPercent != null ? (
                      <span className="text-[11px] text-muted-foreground">
                        {achievement.globalUnlockedPercent.toFixed(1)}%
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Previous"
            className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-xs text-muted-foreground">
            {page + 1} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page === pageCount - 1}
            aria-label="Next"
            className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}
