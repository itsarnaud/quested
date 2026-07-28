"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { GameCard } from "@/components/game-card";

export function SearchView() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

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
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a game…"
        className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-accent"
      />

      {isFetching ? (
        <p className="text-sm text-muted-foreground">Searching…</p>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
        {games?.map((game) => (
          <GameCard
            key={game.id}
            slug={game.slug}
            title={game.title}
            releaseYear={game.releaseYear}
            coverUrl={game.coverUrl}
          />
        ))}
      </div>
    </div>
  );
}
