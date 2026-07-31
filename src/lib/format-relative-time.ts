export function formatRelativeTime(date: Date, locale: string) {
  const diffMs = date.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "always", style: "long" });
  const abs = Math.abs(diffMs);
  if (abs < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diffMs / 3_600_000), "hour");
  if (abs < 30 * 86_400_000) return rtf.format(Math.round(diffMs / 86_400_000), "day");
  if (abs < 365 * 86_400_000) return rtf.format(Math.round(diffMs / (30 * 86_400_000)), "month");
  return rtf.format(Math.round(diffMs / (365 * 86_400_000)), "year");
}
