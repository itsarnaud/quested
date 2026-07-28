"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Link } from "@/i18n/navigation";
import { BellIcon } from "@/components/icons/bell-icon";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const t = useTranslations("Notifications");
  const [open, setOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: unreadCount } = trpc.notification.unreadCount.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const { data: notifications } = trpc.notification.list.useQuery(undefined, { enabled: open });
  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      utils.notification.unreadCount.invalidate();
      utils.notification.list.invalidate();
    },
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && unreadCount) markAllRead.mutate();
        }}
        className="relative flex size-9 items-center justify-center rounded-md hover:bg-muted"
        aria-label={t("title")}
      >
        <BellIcon />
        {unreadCount ? (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent" />
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-72 rounded-md border border-border bg-card p-2 shadow-sm">
            <span className="block px-1 py-1 text-xs font-medium text-muted-foreground">{t("title")}</span>
            {notifications && notifications.length > 0 ? (
              <div className="flex flex-col">
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.type === "LIKE" && n.log ? `/games/${n.log.game.slug}` : `/u/${n.actor.username}`}
                    className={cn(
                      "flex items-center gap-2 rounded px-1 py-2 text-sm hover:bg-muted",
                      !n.read && "bg-muted/50",
                    )}
                    onClick={() => setOpen(false)}
                  >
                    <div className="relative size-7 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                      {n.actor.image ? (
                        <Image
                          src={n.actor.image}
                          alt={n.actor.username ?? ""}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <span>
                      <span className="font-medium">@{n.actor.username}</span>{" "}
                      {n.type === "LIKE" && n.log
                        ? t("liked", { game: n.log.game.title })
                        : t("startedFollowing")}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-1 py-3 text-sm text-muted-foreground">{t("empty")}</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
