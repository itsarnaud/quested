const HISTOGRAM_BUCKETS = [
  { label: "0-2", min: 0, max: 2 },
  { label: "2-4", min: 2, max: 4 },
  { label: "4-6", min: 4, max: 6 },
  { label: "6-8", min: 6, max: 8 },
  { label: "8-10", min: 8, max: 10.01 },
] as const;

export type GameStatsBoxProps = {
  averageRating: number | null;
  ratingCount: number;
  ratings: number[];
  statusCounts: Record<string, number>;
  reviewCount: number;
  listCount: number;
  labels: {
    avgRating: string;
    statusLabels: Record<string, string>;
    reviews: string;
    lists: string;
  };
};

export function GameStatsBox({
  averageRating,
  ratingCount,
  ratings,
  statusCounts,
  reviewCount,
  listCount,
  labels,
}: GameStatsBoxProps) {
  const bucketCounts = HISTOGRAM_BUCKETS.map(
    (bucket) => ratings.filter((r) => r >= bucket.min && r < bucket.max).length,
  );
  const maxBucket = Math.max(1, ...bucketCounts);

  const tiles = [
    ...Object.entries(statusCounts).map(([status, count]) => ({
      label: labels.statusLabels[status] ?? status,
      count,
    })),
    { label: labels.reviews, count: reviewCount },
    { label: labels.lists, count: listCount },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
      <div className="flex min-w-40 flex-col gap-2 rounded-md border border-border p-4">
        <span className="text-xs font-medium text-muted-foreground">{labels.avgRating}</span>
        <span className="text-3xl font-semibold tracking-tight">
          {averageRating != null ? averageRating.toFixed(1) : "—"}
        </span>
        {ratingCount > 0 ? (
          <div className="flex h-12 items-end gap-1">
            {bucketCounts.map((count, i) => (
              <div
                key={HISTOGRAM_BUCKETS[i].label}
                className="w-4 rounded-t bg-accent/70"
                style={{ height: `${Math.max(4, (count / maxBucket) * 100)}%` }}
                title={`${HISTOGRAM_BUCKETS[i].label} : ${count}`}
              />
            ))}
          </div>
        ) : null}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0</span>
          <span>10</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col gap-1 rounded-md border border-border p-3">
            <span className="text-lg font-semibold tracking-tight">{tile.count}</span>
            <span className="text-xs text-muted-foreground">{tile.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
