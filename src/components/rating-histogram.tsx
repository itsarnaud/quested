const HISTOGRAM_BUCKETS = Array.from({ length: 10 }, (_, i) => ({
  label: `${i}-${i + 1}`,
  min: i,
  max: i === 9 ? 10.01 : i + 1,
}));

export type RatingHistogramProps = {
  averageRating: number | null;
  ratingCount: number;
  ratings: number[];
  ratingLabel: string;
};

export function RatingHistogram({ averageRating, ratingCount, ratings, ratingLabel }: RatingHistogramProps) {
  const bucketCounts = HISTOGRAM_BUCKETS.map(
    (bucket) => ratings.filter((r) => r >= bucket.min && r < bucket.max).length,
  );
  const maxBucket = Math.max(1, ...bucketCounts);

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4 sm:w-52">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">{ratingLabel}</span>
        <span className="text-3xl font-semibold tracking-tight">
          {averageRating != null ? averageRating.toFixed(1) : "—"}
        </span>
      </div>
      {ratingCount > 0 ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex h-14 items-end gap-1">
            {bucketCounts.map((count, i) => (
              <div
                key={HISTOGRAM_BUCKETS[i].label}
                className="flex-1 rounded-t bg-accent/70"
                style={{ height: `${Math.max(6, (count / maxBucket) * 100)}%` }}
                title={`${HISTOGRAM_BUCKETS[i].label} : ${count}`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>10</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
