"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export function GameListsSection({ username, canEdit }: { username: string; canEdit: boolean }) {
  const t = useTranslations("Lists");
  const tCommon = useTranslations("Common");
  const utils = trpc.useUtils();
  const { data: lists } = trpc.gameList.byUser.useQuery({ username });

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const createList = trpc.gameList.create.useMutation({
    onSuccess: () => {
      utils.gameList.byUser.invalidate({ username });
      setCreating(false);
      setTitle("");
      setDescription("");
      toast.success(t("listCreated"));
    },
    onError: () => toast.error(tCommon("genericError")),
  });

  return (
    <div className="flex flex-col gap-4">
      {canEdit ? (
        creating ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim()) createList.mutate({ title: title.trim(), description: description.trim() || undefined });
            }}
            className="flex flex-col gap-2 rounded-md border border-border p-3"
          >
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              maxLength={80}
              className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              maxLength={280}
              className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={!title.trim() || createList.isPending}>
                {t("save")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setCreating(false);
                  setTitle("");
                  setDescription("");
                }}
              >
                {t("cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <Button type="button" variant="secondary" className="w-fit" onClick={() => setCreating(true)}>
            {t("createButton")}
          </Button>
        )
      ) : null}

      {lists && lists.length > 0 ? (
        <div className="flex flex-col gap-3">
          {lists.map((list) => (
            <Link
              key={list.id}
              href={`/u/${username}/lists/${list.id}`}
              className="group flex flex-col gap-3"
            >
              <div className="flex flex-col">
                <span className="font-medium group-hover:underline">{list.title}</span>
                <span className="text-sm text-muted-foreground">
                  {t("itemCount", { count: list.itemCount })}
                </span>
                {list.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{list.description}</p>
                ) : null}
              </div>
              {list.preview.length > 0 ? (
                <div className="flex gap-2">
                  {list.preview.map((game) => (
                    <div
                      key={game.id}
                      className="relative h-20 w-[60px] shrink-0 overflow-hidden rounded border border-border bg-muted"
                    >
                      {game.coverUrl ? (
                        <Image src={game.coverUrl} alt={game.title} fill unoptimized className="object-cover" />
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      ) : !creating ? (
        <EmptyState title={t("empty")} subtitle={t("emptySubtitle")} />
      ) : null}
    </div>
  );
}
