import { GhostBody } from "@/components/icons/ghost-body";

export function WelcomeIllustration(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 100" width="96" height="80" shapeRendering="crispEdges" {...props}>
      {/* Waving hand, motion lines trailing behind it */}
      <g fill="currentColor">
        <rect x="86" y="20" width="8" height="8" />
        <rect x="94" y="12" width="8" height="8" />
        <rect x="94" y="28" width="8" height="8" />
      </g>
      <g fill="currentColor" opacity="0.4">
        <rect x="80" y="8" width="6" height="4" />
        <rect x="80" y="34" width="6" height="4" />
        <rect x="106" y="16" width="6" height="4" />
      </g>

      <GhostBody />

      {/* Wide-open, happy eyes */}
      <g fill="var(--color-background)">
        <rect x="34" y="46" width="8" height="8" />
        <rect x="58" y="46" width="8" height="8" />
      </g>
      {/* Grin */}
      <g fill="var(--color-background)">
        <rect x="38" y="64" width="4" height="4" />
        <rect x="42" y="68" width="16" height="4" />
        <rect x="58" y="64" width="4" height="4" />
      </g>
    </svg>
  );
}
