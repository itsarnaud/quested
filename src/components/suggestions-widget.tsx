"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Link } from "@/i18n/navigation";

const WIDGET_SUGGESTIONS = 3;

export function SuggestionsWidget() {
  const t = useTranslations("Home");
  const tPeople = useTranslations("People");
  const tFollow = useTranslations("Follow");

  const utils = trpc.useUtils();
  const { data: suggestions } = trpc.user.suggestions.useQuery();
  const toggle = trpc.follow.toggle.useMutation({
    onSuccess: () => utils.user.suggestions.invalidate(),
  });

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("widgetSuggestions")}
      </h2>
      <div className="flex flex-col gap-3">
        {suggestions.slice(0, WIDGET_SUGGESTIONS).map((user) => (
          <div key={user.id} className="flex items-center justify-between gap-3">
            <Link href={`/u/${user.username}`} prefetch={false} className="flex min-w-0 items-center gap-2.5">
              <div className="relative size-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                {user.image ? (
                  <Image src={user.image} alt="" fill unoptimized className="object-cover" />
                ) : null}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{user.name ?? user.username}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.mutualCount} {tPeople("mutualFollows", { count: user.mutualCount })}
                </span>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => user.username && toggle.mutate({ username: user.username })}
              disabled={toggle.isPending}
              className="shrink-0 text-sm font-medium text-accent transition-colors hover:text-foreground disabled:opacity-50"
            >
              {tFollow("follow")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
