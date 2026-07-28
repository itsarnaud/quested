import Image from "next/image";
import { Link } from "@/i18n/navigation";

type GameCardProps = {
  slug: string;
  title: string;
  releaseYear: number | null;
  coverUrl: string | null;
};

export function GameCard({ slug, title, releaseYear, coverUrl }: GameCardProps) {
  return (
    <Link href={`/games/${slug}`} className="flex flex-col gap-2">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md border border-border bg-muted">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 45vw, 160px"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="flex flex-col">
        <span className="truncate text-sm font-medium">{title}</span>
        {releaseYear ? (
          <span className="text-xs text-muted-foreground">{releaseYear}</span>
        ) : null}
      </div>
    </Link>
  );
}
