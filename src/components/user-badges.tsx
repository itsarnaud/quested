import { getTranslations } from "next-intl/server";
import type { Badge } from "@/generated/prisma/client";
import { Logo } from "@/components/icons/logo";

const BADGE_COLOR: Record<Exclude<Badge, "FOUNDER">, string> = {
  EARLY_ADOPTER: "text-emerald-500",
  BETA_TESTER: "text-amber-500",
};

function CheckBadgeIcon({ className, title }: { className?: string; title: string }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path
        d="M8.5 12.5l2.5 2.5 5-5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export async function UserBadges({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return null;
  const t = await getTranslations("Badges");

  return (
    <span className="inline-flex items-center gap-1">
      {badges.map((badge) =>
        badge === "FOUNDER" ? (
          <span key={badge} title={t(badge)}>
            <Logo width={14} height={14} role="img" aria-label={t(badge)} />
          </span>
        ) : (
          <CheckBadgeIcon key={badge} className={BADGE_COLOR[badge]} title={t(badge)} />
        ),
      )}
    </span>
  );
}
