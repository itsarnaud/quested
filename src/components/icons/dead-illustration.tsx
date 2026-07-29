import { GhostBody } from "@/components/icons/ghost-body";

export function DeadIllustration(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 100" width="140" height="110" shapeRendering="crispEdges" {...props}>
      {/* Broken pixel bits, drifting off */}
      <g fill="currentColor" opacity="0.35">
        <rect x="11" y="11" width="6" height="6" transform="rotate(45 14 14)" />
        <rect x="97" y="57" width="8" height="8" transform="rotate(45 101 61)" />
        <rect x="9" y="69" width="5" height="5" transform="rotate(45 11.5 71.5)" />
      </g>

      {/* Pixel X, floating above */}
      <g fill="currentColor" opacity="0.55">
        <rect x="78" y="6" width="6" height="6" />
        <rect x="102" y="6" width="6" height="6" />
        <rect x="84" y="12" width="6" height="6" />
        <rect x="96" y="12" width="6" height="6" />
        <rect x="90" y="18" width="6" height="6" />
        <rect x="84" y="24" width="6" height="6" />
        <rect x="96" y="24" width="6" height="6" />
        <rect x="78" y="30" width="6" height="6" />
        <rect x="102" y="30" width="6" height="6" />
      </g>

      <GhostBody />

      {/* X_X eyes */}
      <g fill="var(--color-background)">
        <rect x="36" y="46" width="3" height="3" />
        <rect x="42" y="46" width="3" height="3" />
        <rect x="39" y="49" width="3" height="3" />
        <rect x="36" y="52" width="3" height="3" />
        <rect x="42" y="52" width="3" height="3" />

        <rect x="60" y="46" width="3" height="3" />
        <rect x="66" y="46" width="3" height="3" />
        <rect x="63" y="49" width="3" height="3" />
        <rect x="60" y="52" width="3" height="3" />
        <rect x="66" y="52" width="3" height="3" />
      </g>
    </svg>
  );
}
