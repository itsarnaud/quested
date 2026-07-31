"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { GameCard } from "@/components/game-card";
import { SearchHistoryDropdown } from "@/components/search-history-dropdown";
import { SearchIcon } from "@/components/icons/search-icon";
import { useSearchHistory } from "@/lib/use-search-history";

export function SearchView({ initialQuery = "" }: { initialQuery?: string }) {
  const t = useTranslations("Search");
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [genre, setGenre] = useState("");
  const [platform, setPlatform] = useState("");
  const [year, setYear] = useState("");
  const history = useSearchHistory("games");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(id);
  }, [query]);

  const { data: filterOptions } = trpc.game.filterOptions.useQuery();

  const hasFilters = Boolean(genre || platform || year);
  const isSearching = debouncedQuery.trim().length > 1 || hasFilters;

  const { data: games, isFetching } = trpc.game.search.useQuery(
    {
      query: debouncedQuery,
      genre: genre || undefined,
      platform: platform || undefined,
      year: year ? Number(year) : undefined,
    },
    { enabled: isSearching },
  );
  const { data: popularGames } = trpc.game.popular.useQuery(undefined, { enabled: !isSearching });

  const displayedGames = isSearching ? games : popularGames;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
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

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="h-9 rounded-md border border-border bg-card px-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent"
        >
          <option value="">{t("filterGenre")}</option>
          {filterOptions?.genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="h-9 rounded-md border border-border bg-card px-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent"
        >
          <option value="">{t("filterPlatform")}</option>
          {filterOptions?.platforms.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="h-9 rounded-md border border-border bg-card px-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent"
        >
          <option value="">{t("filterYear")}</option>
          {filterOptions?.years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setGenre("");
              setPlatform("");
              setYear("");
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("filterClear")}
          </button>
        ) : null}
      </div>

      {isFetching ? <p className="text-sm text-muted-foreground">{t("searching")}</p> : null}

      {!isSearching && popularGames && popularGames.length > 0 ? (
        <h2 className="text-sm font-medium text-muted-foreground">{t("popularTitle")}</h2>
      ) : null}

      {isSearching && !isFetching && displayedGames && displayedGames.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noResults")}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {displayedGames?.map((game) => (
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
