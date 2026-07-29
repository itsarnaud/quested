import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

function getPageWindow(page: number, totalPages: number): (number | "ellipsis")[] {
  const delta = 1;
  const left = Math.max(2, page - delta);
  const right = Math.min(totalPages - 1, page + delta);
  const range: (number | "ellipsis")[] = [1];

  if (left > 2) range.push("ellipsis");
  for (let i = left; i <= right; i++) range.push(i);
  if (right < totalPages - 1) range.push("ellipsis");
  if (totalPages > 1) range.push(totalPages);

  return range;
}

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = getPageWindow(page, totalPages);

  return (
    <nav className="flex items-center justify-center gap-1 text-sm">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        tabIndex={page === 1 ? -1 : undefined}
        className={cn(
          "rounded-md px-3 py-1.5",
          page === 1 ? "pointer-events-none text-muted-foreground/40" : "text-muted-foreground hover:text-foreground",
        )}
      >
        ‹
      </Link>

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            className={cn(
              "rounded-md px-3 py-1.5",
              p === page ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p}
          </Link>
        ),
      )}

      <Link
        href={buildHref(Math.min(totalPages, page + 1))}
        aria-disabled={page === totalPages}
        tabIndex={page === totalPages ? -1 : undefined}
        className={cn(
          "rounded-md px-3 py-1.5",
          page === totalPages ? "pointer-events-none text-muted-foreground/40" : "text-muted-foreground hover:text-foreground",
        )}
      >
        ›
      </Link>
    </nav>
  );
}
