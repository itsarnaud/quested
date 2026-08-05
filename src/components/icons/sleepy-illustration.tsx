import { GhostBody } from "@/components/icons/ghost-body";

export function SleepyIllustration(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 100" width="96" height="80" shapeRendering="crispEdges" {...props}>
      {/* Drifting "Z"s — nothing's wrong, it's just quiet here */}
      <g fill="currentColor" opacity="0.55">
        <rect x="78" y="8" width="18" height="6" />
        <rect x="90" y="14" width="6" height="6" />
        <rect x="84" y="20" width="6" height="6" />
        <rect x="78" y="26" width="18" height="6" />
      </g>
      <g fill="currentColor" opacity="0.3">
        <rect x="96" y="34" width="10" height="4" />
        <rect x="102" y="38" width="4" height="4" />
        <rect x="98" y="42" width="4" height="4" />
        <rect x="96" y="46" width="10" height="4" />
      </g>

      <GhostBody />

      {/* Closed, sleepy eyes — flat lines instead of squares */}
      <g fill="var(--color-background)">
        <rect x="34" y="49" width="12" height="3" />
        <rect x="58" y="49" width="12" height="3" />
      </g>
    </svg>
  );
}
