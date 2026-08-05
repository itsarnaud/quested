"use client";

import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { PersonRow } from "@/components/person-row";
import { EmptyState } from "@/components/empty-state";

export function FollowList({ username, type }: { username: string; type: "followers" | "following" }) {
  const t = useTranslations("Follow");
  const tCommon = useTranslations("Common");
  const utils = trpc.useUtils();
  const { data: users } = trpc.follow.list.useQuery({ username, type });
  const toggle = trpc.follow.toggle.useMutation({
    onSuccess: () => utils.follow.list.invalidate({ username, type }),
    onError: () => toast.error(tCommon("genericError")),
  });

  if (users && users.length === 0) {
    return (
      <EmptyState
        title={t(type === "followers" ? "noFollowers" : "noFollowing")}
        subtitle={t(type === "followers" ? "noFollowersSubtitle" : "noFollowingSubtitle")}
      />
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {users?.map((user) => (
        <PersonRow
          key={user.id}
          user={user}
          subtitle={`@${user.username}`}
          onToggleFollow={() => {
            if (!user.username) return;
            const wasFollowing = user.isFollowing;
            toggle.mutate(
              { username: user.username },
              { onSuccess: () => toast.success(wasFollowing ? t("unfollowedToast") : t("followedToast")) },
            );
          }}
          isTogglePending={toggle.isPending}
        />
      ))}
    </div>
  );
}
