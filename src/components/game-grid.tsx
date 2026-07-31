import { GameCard } from "@/components/game-card";
import type { Game } from "@/generated/prisma/client";

// On mobile the grid becomes a horizontal scroll row — one swipe instead of
// a long vertical wall of covers.
export function GameGrid({ games }: { games: Game[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0 md:grid-cols-5 lg:grid-cols-6">
      {games.map((game) => (
        <div key={game.id} className="w-32 shrink-0 sm:w-auto">
          <GameCard slug={game.slug} title={game.title} releaseYear={game.releaseYear} coverUrl={game.coverUrl} />
        </div>
      ))}
    </div>
  );
}
