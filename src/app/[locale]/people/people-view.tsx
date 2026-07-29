"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { SearchHistoryDropdown } from "@/components/search-history-dropdown";
import { useSearchHistory } from "@/lib/use-search-history";
import { UserBadgesClient } from "@/components/user-badges-client";
import type { Badge } from "@/generated/prisma/client";

type Person = {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  badges: Badge[];
  isFollowing: boolean;
};

function PersonRow({
  user,
  subtitle,
  onNavigate,
  onToggleFollow,
  isTogglePending,
}: {
  user: Person;
  subtitle: string;
  onNavigate?: () => void;
  onToggleFollow: () => void;
  isTogglePending: boolean;
}) {
  const tFollow = useTranslations("Follow");

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
      <Link
        href={`/u/${user.username}`}
        className="flex min-w-0 items-center gap-3"
        onClick={onNavigate}
      >
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
          <span className="flex min-w-0 items-center gap-1 text-sm font-medium">
            <span className="truncate">{user.name ?? user.username}</span>
            <UserBadgesClient badges={user.badges} />
          </span>
          <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
        </div>
      </Link>
      <Button variant={user.isFollowing ? "secondary" : "primary"} onClick={onToggleFollow} disabled={isTogglePending}>
        {user.isFollowing ? tFollow("unfollow") : tFollow("follow")}
      </Button>
    </div>
  );
}

export function PeopleView() {
  const t = useTranslations("People");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const history = useSearchHistory("people");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(id);
  }, [query]);

  const isSearching = debouncedQuery.trim().length > 1;

  const utils = trpc.useUtils();
  const { data: users, isFetching } = trpc.user.search.useQuery(
    { query: debouncedQuery },
    { enabled: isSearching },
  );
  const { data: suggestions } = trpc.user.suggestions.useQuery(undefined, { enabled: !isSearching });
  const { data: recentUsers } = trpc.user.recent.useQuery(undefined, {
    enabled: !isSearching && (suggestions?.length ?? 0) === 0,
  });
  const toggle = trpc.follow.toggle.useMutation({
    onSuccess: () => {
      utils.user.search.invalidate();
      utils.user.suggestions.invalidate();
      utils.user.recent.invalidate();
    },
  });

  const discovery = suggestions && suggestions.length > 0
    ? { title: t("suggestionsTitle"), people: suggestions, mutual: true }
    : recentUsers && recentUsers.length > 0
      ? { title: t("recentTitle"), people: recentUsers, mutual: false }
      : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={history.onFocus}
          onBlur={history.onBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim().length > 1) {
              history.commit(query.trim());
              history.setOpen(false);
            }
          }}
          placeholder={t("placeholder")}
          className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-accent"
        />
        {history.open && query.trim().length === 0 ? (
          <SearchHistoryDropdown
            terms={history.terms}
            onSelect={(term) => {
              setQuery(term);
              setDebouncedQuery(term);
              history.setOpen(false);
            }}
            onRemove={history.remove}
            onClear={history.clear}
          />
        ) : null}
      </div>

      {isFetching ? <p className="text-sm text-muted-foreground">{t("searching")}</p> : null}

      {isSearching && !isFetching && users && users.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noResults")}</p>
      ) : null}

      {isSearching ? (
        <div className="flex flex-col gap-2">
          {users?.map((user) => (
            <PersonRow
              key={user.id}
              user={user}
              subtitle={`@${user.username}`}
              onNavigate={() => query.trim().length > 1 && history.commit(query.trim())}
              onToggleFollow={() => user.username && toggle.mutate({ username: user.username })}
              isTogglePending={toggle.isPending}
            />
          ))}
        </div>
      ) : discovery ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">{discovery.title}</h2>
          <div className="flex flex-col gap-2">
            {discovery.people.map((user) => (
              <PersonRow
                key={user.id}
                user={user}
                subtitle={
                  discovery.mutual && "mutualCount" in user
                    ? `${user.mutualCount} ${t("mutualFollows", { count: Number(user.mutualCount) })}`
                    : `@${user.username}`
                }
                onToggleFollow={() => user.username && toggle.mutate({ username: user.username })}
                isTogglePending={toggle.isPending}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
