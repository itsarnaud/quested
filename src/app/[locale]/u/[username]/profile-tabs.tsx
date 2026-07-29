"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Tab = "games" | "diary" | "reviews" | "likes" | "lists";

export function ProfileTabs({
  gamesLabel,
  diaryLabel,
  reviewsLabel,
  likesLabel,
  listsLabel,
  gamesContent,
  diaryContent,
  reviewsContent,
  likesContent,
  listsContent,
}: {
  gamesLabel: string;
  diaryLabel: string;
  reviewsLabel: string;
  likesLabel: string;
  listsLabel: string;
  gamesContent: React.ReactNode;
  diaryContent: React.ReactNode;
  reviewsContent: React.ReactNode;
  likesContent: React.ReactNode;
  listsContent: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("games");

  const tabs: { key: Tab; label: string }[] = [
    { key: "games", label: gamesLabel },
    { key: "diary", label: diaryLabel },
    { key: "reviews", label: reviewsLabel },
    { key: "likes", label: likesLabel },
    { key: "lists", label: listsLabel },
  ];

  const content = {
    games: gamesContent,
    diary: diaryContent,
    reviews: reviewsContent,
    likes: likesContent,
    lists: listsContent,
  }[tab];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-1 border-b border-border">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium",
              tab === key
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {content}
    </div>
  );
}
