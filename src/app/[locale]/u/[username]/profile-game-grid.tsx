import { Link } from "@/i18n/navigation";
import { GameTile, type GameTileData } from "@/components/game-tile";

const PREVIEW_SIZE = 16;

export function ProfileGameGrid({
  games,
  moreHref,
  moreLabel,
}: {
  games: GameTileData[];
  moreHref: string;
  moreLabel: string;
}) {
  const shown = games.slice(0, PREVIEW_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0 md:grid-cols-6 lg:grid-cols-8">
        {shown.map((game) => (
          <div key={game.id} className="w-28 shrink-0 sm:w-auto">
            <GameTile game={game} />
          </div>
        ))}
      </div>

      {games.length > PREVIEW_SIZE ? (
        <Link href={moreHref} className="w-fit text-sm text-muted-foreground hover:text-foreground">
          {moreLabel}
        </Link>
      ) : null}
    </div>
  );
}
