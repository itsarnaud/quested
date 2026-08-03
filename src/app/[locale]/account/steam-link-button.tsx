"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SteamIcon } from "@/components/icons/steam-icon";
import { Button } from "@/components/ui/button";

// Steam's redirect is fast in practice, but there's no way to show progress
// for a real cross-origin navigation — this just reassures the user that
// something is happening and that leaving mid-redirect could interrupt it.
export function SteamLinkButton({
  href,
  label,
  className,
  rounded,
  onNavigate,
}: {
  href: string;
  label: string;
  className?: string;
  rounded?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("Account");
  const [redirecting, setRedirecting] = useState(false);

  return (
    <>
      {/* A plain <a>, not Next's <Link> — this target redirects cross-origin
          to Steam, not a Next.js page. */}
      <a
        href={href}
        className={className}
        onClick={() => {
          onNavigate?.();
          setRedirecting(true);
        }}
      >
        <Button type="button" className={rounded ? "w-full rounded-full" : "w-full"}>
          {label}
        </Button>
      </a>

      {redirecting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-xs flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 text-center">
            <SteamIcon width={28} height={28} />
            <p className="text-sm font-medium">{t("steamRedirecting")}</p>
            <p className="text-xs text-muted-foreground">{t("steamRedirectingWarning")}</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div className="h-full w-full animate-pulse rounded-full bg-accent" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
