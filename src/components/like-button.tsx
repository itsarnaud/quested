"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { HeartIcon } from "@/components/icons/heart-icon";

export function LikeButton({
  logId,
  initialLiked,
  initialCount,
}: {
  logId: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  const toggle = trpc.like.toggle.useMutation({
    onError: () => {
      setLiked((v) => !v);
      setCount((c) => (liked ? c + 1 : c - 1));
    },
  });

  return (
    <button
      type="button"
      onClick={() => {
        setLiked((v) => !v);
        setCount((c) => (liked ? c - 1 : c + 1));
        toggle.mutate({ logId });
      }}
      className={cn(
        "flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground",
        liked && "text-red-500 hover:text-red-500",
      )}
    >
      <HeartIcon filled={liked} />
      {count > 0 ? count : null}
    </button>
  );
}
