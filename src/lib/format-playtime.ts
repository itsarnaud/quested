export function formatPlaytime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  return `${Math.round(minutes / 60)} h`;
}
