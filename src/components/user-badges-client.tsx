"use client";

import { useTranslations } from "next-intl";
import type { Badge } from "@/generated/prisma/client";
import { BadgeIcon } from "@/components/badge-icons";

export function UserBadgesClient({ badges }: { badges: Badge[] }) {
  const t = useTranslations("Badges");
  if (badges.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-1">
      {badges.map((badge) => (
        <BadgeIcon key={badge} badge={badge} label={t(badge)} />
      ))}
    </span>
  );
}
