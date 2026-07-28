"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

export function FollowSection({
  username,
  showButton,
}: {
  username: string;
  showButton: boolean;
}) {
  const t = useTranslations("Follow");
  const utils = trpc.useUtils();
  const { data } = trpc.follow.status.useQuery({ username });
  const toggle = trpc.follow.toggle.useMutation({
    onSuccess: () => utils.follow.status.invalidate({ username }),
  });

  return (
    <div className="flex items-center gap-4">
      <div className="flex gap-3 text-sm text-muted-foreground">
        <span>
          <strong className="text-foreground">{data?.followerCount ?? 0}</strong> {t("followers")}
        </span>
        <span>
          <strong className="text-foreground">{data?.followingCount ?? 0}</strong> {t("following")}
        </span>
      </div>
      {showButton ? (
        <Button
          variant={data?.isFollowing ? "secondary" : "primary"}
          onClick={() => toggle.mutate({ username })}
          disabled={toggle.isPending}
        >
          {data?.isFollowing ? t("unfollow") : t("follow")}
        </Button>
      ) : null}
    </div>
  );
}
