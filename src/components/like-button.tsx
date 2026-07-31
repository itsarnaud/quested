"use client";

import { useState } from "react";
import { useAnimate } from "motion/react";
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
  // Imperative pop instead of a keyed remount: the feed renders inside the
  // Tabs' AnimatePresence (initial={false}), which suppresses initial
  // animations for the whole subtree and would swallow the remount pop.
  const [heartScope, animateHeart] = useAnimate();

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
        animateHeart(heartScope.current, { scale: [0.6, 1] }, { type: "spring", stiffness: 500, damping: 15 });
        toggle.mutate({ logId });
      }}
      className={cn(
        "flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground",
        liked && "text-red-500 hover:text-red-500",
      )}
    >
      <span ref={heartScope} className="inline-flex">
        <HeartIcon filled={liked} />
      </span>
      {count > 0 ? count : null}
    </button>
  );
}
