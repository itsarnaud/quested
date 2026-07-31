import type { Badge } from "@/generated/prisma/client";
import { Logo } from "@/components/icons/logo";
import { BadgeTooltip } from "@/components/badge-tooltip";

const BADGE_COLOR: Record<Exclude<Badge, "FOUNDER">, string> = {
  EARLY_ADOPTER: "text-emerald-500",
  BETA_TESTER: "text-amber-500",
  BUG_HUNTER: "text-red-500",
  CONTRIBUTOR: "text-sky-500",
  SUPPORTER: "text-pink-500",
};

// White glyph drawn inside the colored disc, one per badge.
const BADGE_GLYPH: Record<Exclude<Badge, "FOUNDER">, React.ReactNode> = {
  // Star
  EARLY_ADOPTER: (
    <path
      d="M12 6.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z"
      fill="white"
    />
  ),
  // Flask
  BETA_TESTER: (
    <path
      d="M10 6.8h4M11 6.8v3.4l-2.7 4.5a1.7 1.7 0 0 0 1.4 2.5h4.6a1.7 1.7 0 0 0 1.4-2.5L13 10.2V6.8"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  // Bug
  BUG_HUNTER: (
    <>
      <ellipse cx="12" cy="13" rx="3.2" ry="4.2" fill="white" />
      <path
        d="M10.3 8.2L8.8 6.7M13.7 8.2l1.5-1.5M8.6 13H6.4M17.6 13h-2.2"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  // Code brackets
  CONTRIBUTOR: (
    <path
      d="M9.3 9.5L6.8 12l2.5 2.5M14.7 9.5l2.5 2.5-2.5 2.5"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  // Heart
  SUPPORTER: (
    <path
      d="M12 17s-4.6-2.7-4.6-5.7c0-1.5 1.2-2.8 2.7-2.8 1 0 1.6.5 1.9 1 .3-.5.9-1 1.9-1 1.5 0 2.7 1.3 2.7 2.8 0 3-4.6 5.7-4.6 5.7z"
      fill="white"
    />
  ),
};

function GlyphBadgeIcon({ badge, title }: { badge: Exclude<Badge, "FOUNDER">; title: string }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" className={BADGE_COLOR[badge]} role="img" aria-label={title}>
      <title>{title}</title>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      {BADGE_GLYPH[badge]}
    </svg>
  );
}

export function BadgeIcon({ badge, label }: { badge: Badge; label: string }) {
  return (
    <BadgeTooltip label={label}>
      {badge === "FOUNDER" ? (
        <Logo width={14} height={14} role="img" aria-label={label} />
      ) : (
        <GlyphBadgeIcon badge={badge} title={label} />
      )}
    </BadgeTooltip>
  );
}
