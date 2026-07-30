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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {shown.map((game) => (
          <GameTile key={game.id} game={game} />
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
