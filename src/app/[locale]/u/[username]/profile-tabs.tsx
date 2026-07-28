"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Tab = "games" | "reviews" | "likes";

export function ProfileTabs({
  gamesLabel,
  reviewsLabel,
  likesLabel,
  gamesContent,
  reviewsContent,
  likesContent,
}: {
  gamesLabel: string;
  reviewsLabel: string;
  likesLabel: string;
  gamesContent: React.ReactNode;
  reviewsContent: React.ReactNode;
  likesContent: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("games");

  const tabs: { key: Tab; label: string }[] = [
    { key: "games", label: gamesLabel },
    { key: "reviews", label: reviewsLabel },
    { key: "likes", label: likesLabel },
  ];

  const content = { games: gamesContent, reviews: reviewsContent, likes: likesContent }[tab];

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
