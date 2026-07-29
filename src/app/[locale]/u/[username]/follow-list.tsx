"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { PersonRow } from "@/components/person-row";

export function FollowList({ username, type }: { username: string; type: "followers" | "following" }) {
  const t = useTranslations("Follow");
  const utils = trpc.useUtils();
  const { data: users } = trpc.follow.list.useQuery({ username, type });
  const toggle = trpc.follow.toggle.useMutation({
    onSuccess: () => utils.follow.list.invalidate({ username, type }),
  });

  if (users && users.length === 0) {
    return <p className="text-sm text-muted-foreground">{t(type === "followers" ? "noFollowers" : "noFollowing")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {users?.map((user) => (
        <PersonRow
          key={user.id}
          user={user}
          subtitle={`@${user.username}`}
          onToggleFollow={() => user.username && toggle.mutate({ username: user.username })}
          isTogglePending={toggle.isPending}
        />
      ))}
    </div>
  );
}
