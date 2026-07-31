"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { UserBadgesClient } from "@/components/user-badges-client";
import type { Badge } from "@/generated/prisma/client";

export type Person = {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  badges: Badge[];
  isFollowing: boolean;
  isViewer: boolean;
  bio?: string | null;
  completedCount?: number;
  reviewCount?: number;
};

export function PersonRow({
  user,
  subtitle,
  onNavigate,
  onToggleFollow,
  isTogglePending,
}: {
  user: Person;
  subtitle?: string;
  onNavigate?: () => void;
  onToggleFollow: () => void;
  isTogglePending: boolean;
}) {
  const t = useTranslations("People");
  const tFollow = useTranslations("Follow");

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <Link href={`/u/${user.username}`} prefetch={false} className="flex min-w-0 items-center gap-4" onClick={onNavigate}>
        <div className="relative size-12 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name ?? user.username ?? ""}
              fill
              unoptimized
              className="object-cover"
            />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1 font-semibold">
            <span className="truncate">{user.name ?? user.username}</span>
            <UserBadgesClient badges={user.badges} />
          </span>
          {user.bio ? (
            <span className="truncate text-sm text-muted-foreground">{user.bio}</span>
          ) : subtitle ? (
            <span className="truncate text-sm text-muted-foreground">{subtitle}</span>
          ) : null}
          {user.completedCount != null && user.reviewCount != null ? (
            <span className="truncate text-xs text-muted-foreground">
              {t("stats", { completed: user.completedCount, reviews: user.reviewCount })}
            </span>
          ) : null}
        </div>
      </Link>
      {user.isViewer ? null : (
        <Button
          variant={user.isFollowing ? "secondary" : "primary"}
          className="shrink-0 rounded-full"
          onClick={onToggleFollow}
          disabled={isTogglePending}
        >
          {user.isFollowing ? tFollow("followingLabel") : tFollow("follow")}
        </Button>
      )}
    </div>
  );
}
