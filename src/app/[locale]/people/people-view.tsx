"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { SearchHistoryDropdown } from "@/components/search-history-dropdown";
import { useSearchHistory } from "@/lib/use-search-history";
import { PersonRow } from "@/components/person-row";
import { SearchIcon } from "@/components/icons/search-icon";
import { Link } from "@/i18n/navigation";

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
  const toggle = trpc.follow.toggle.useMutation({
    onSuccess: () => {
      utils.user.search.invalidate();
      utils.user.suggestions.invalidate();
    },
  });

  const discovery = suggestions && suggestions.length > 0 ? suggestions : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("heading")}</h1>
        <Link href="/leaderboard" className="shrink-0 text-sm font-semibold text-accent hover:underline">
          {t("viewLeaderboard")} ›
        </Link>
      </div>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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
          className="h-11 w-full rounded-full border border-border bg-card pl-11 pr-4 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-accent"
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
        <div className="flex flex-col divide-y divide-border">
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
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("suggestionsTitle")}
          </h2>
          <div className="flex flex-col divide-y divide-border">
            {discovery.map((user) => (
              <PersonRow
                key={user.id}
                user={user}
                subtitle={`${user.mutualCount} ${t("mutualFollows", { count: user.mutualCount })}`}
                onToggleFollow={() => user.username && toggle.mutate({ username: user.username })}
                isTogglePending={toggle.isPending}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("discoveryHint")}</p>
      )}
    </div>
  );
}
