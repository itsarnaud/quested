import Image from "next/image";
import { Link } from "@/i18n/navigation";

export type GameTileData = {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  rating: number | null;
  notes: string | null;
};

export function GameTile({ game }: { game: GameTileData }) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className="flex flex-col gap-2 hover:opacity-90"
      title={game.notes ?? undefined}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md border border-border bg-muted">
        {game.coverUrl ? (
          <Image
            src={game.coverUrl}
            alt={game.title}
            fill
            sizes="(max-width: 768px) 45vw, 160px"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="flex flex-col">
        <span className="truncate text-sm font-medium">{game.title}</span>
        {game.rating != null ? (
          <span className="text-xs text-muted-foreground">{game.rating.toFixed(1)}/10</span>
        ) : null}
        {game.notes ? <span className="truncate text-xs text-muted-foreground">{game.notes}</span> : null}
      </div>
    </Link>
  );
}
