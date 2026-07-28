"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { GameCard } from "@/components/game-card";
import { SearchHistoryDropdown } from "@/components/search-history-dropdown";
import { useSearchHistory } from "@/lib/use-search-history";

export function SearchView() {
  const t = useTranslations("Search");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const history = useSearchHistory("games");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(id);
  }, [query]);

  const { data: games, isFetching } = trpc.game.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.trim().length > 1 },
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
        {games?.map((game) => (
          <GameCard
            key={game.id}
            slug={game.slug}
            title={game.title}
            releaseYear={game.releaseYear}
            coverUrl={game.coverUrl}
            onClick={() => query.trim().length > 1 && history.commit(query.trim())}
          />
        ))}
      </div>
    </div>
  );
}
