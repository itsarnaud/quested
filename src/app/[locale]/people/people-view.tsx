"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function PeopleView() {
  const t = useTranslations("People");
  const tFollow = useTranslations("Follow");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(id);
  }, [query]);

  const utils = trpc.useUtils();
  const { data: users, isFetching } = trpc.user.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.trim().length > 1 },
  );
  const toggle = trpc.follow.toggle.useMutation({
    onSuccess: () => utils.user.search.invalidate({ query: debouncedQuery }),
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("placeholder")}
        className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-accent"
      />

      {isFetching ? <p className="text-sm text-muted-foreground">{t("searching")}</p> : null}

      {!isFetching && users && users.length === 0 && debouncedQuery.trim().length > 1 ? (
        <p className="text-sm text-muted-foreground">{t("noResults")}</p>
      ) : null}

      <div className="flex flex-col gap-2">
        {users?.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
          >
            <Link href={`/u/${user.username}`} className="flex min-w-0 items-center gap-3">
              <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
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
              <div className="min-w-0 flex flex-col">
                <span className="truncate text-sm font-medium">{user.name ?? user.username}</span>
                <span className="truncate text-xs text-muted-foreground">@{user.username}</span>
              </div>
            </Link>
            <Button
              variant={user.isFollowing ? "secondary" : "primary"}
              onClick={() => user.username && toggle.mutate({ username: user.username })}
              disabled={toggle.isPending}
            >
              {user.isFollowing ? tFollow("unfollow") : tFollow("follow")}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
