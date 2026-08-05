import { SleepyIllustration } from "@/components/icons/sleepy-illustration";

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <SleepyIllustration className="text-muted-foreground/40" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {subtitle ? <p className="text-xs text-muted-foreground/60">{subtitle}</p> : null}
      </div>
    </div>
  );
}
