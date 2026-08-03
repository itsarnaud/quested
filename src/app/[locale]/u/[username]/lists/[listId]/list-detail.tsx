"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

type Game = { id: string; slug: string; title: string; coverUrl: string | null };

export function ListDetail({
  username,
  listId,
  initialTitle,
  initialDescription,
  initialItems,
  canEdit,
  canClone,
}: {
  username: string;
  listId: string;
  initialTitle: string;
  initialDescription: string | null;
  initialItems: Game[];
  canEdit: boolean;
  canClone: boolean;
}) {
  const t = useTranslations("Lists");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data } = trpc.gameList.get.useQuery({ listId });
  const list = data ?? {
    title: initialTitle,
    description: initialDescription,
    items: initialItems.map((game) => ({ game })),
  };
  const items = list.items.map((item) => item.game);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(id);
  }, [query]);

  const { data: results } = trpc.game.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.trim().length > 1 && picking },
  );

  const update = trpc.gameList.update.useMutation({
    onSuccess: () => {
      utils.gameList.get.invalidate({ listId });
      setEditing(false);
      toast.success(t("listUpdated"));
    },
    onError: () => toast.error(tCommon("genericError")),
  });
  const del = trpc.gameList.delete.useMutation({
    onSuccess: () => {
      toast.success(t("listDeleted"));
      router.push(`/u/${username}`);
    },
    onError: () => toast.error(tCommon("genericError")),
  });
  const addGame = trpc.gameList.addGame.useMutation({
    onSuccess: () => {
      utils.gameList.get.invalidate({ listId });
      setPicking(false);
      setQuery("");
      toast.success(t("gameAdded"));
    },
    onError: () => toast.error(tCommon("genericError")),
  });
  const removeGame = trpc.gameList.removeGame.useMutation({
    onSuccess: () => {
      utils.gameList.get.invalidate({ listId });
      toast.success(t("gameRemoved"));
    },
    onError: () => toast.error(tCommon("genericError")),
  });
  const clone = trpc.gameList.clone.useMutation({
    onSuccess: (result) => {
      if (result.username) {
        toast.success(t("listCloned"));
        router.push(`/u/${result.username}/lists/${result.listId}`);
      }
    },
    onError: () => toast.error(tCommon("genericError")),
  });

  return (
    <div className="flex flex-col gap-6">
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) update.mutate({ listId, title: title.trim(), description: description.trim() || undefined });
          }}
          className="flex flex-col gap-2 rounded-md border border-border p-3"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("renameTitle")}
            maxLength={80}
            className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("renameDescription")}
            maxLength={280}
            className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={!title.trim() || update.isPending}>
              {t("saveChanges")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold tracking-tight">{list.title}</h1>
            <p className="text-sm text-muted-foreground">
              {list.description || (canEdit ? t("noDescription") : "")}
            </p>
          </div>
          {canEdit ? (
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
                {t("renameTitle")}
              </Button>
              {confirmingDelete ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="border-red-600 text-red-600 hover:bg-red-50"
                  onClick={() => del.mutate({ listId })}
                  disabled={del.isPending}
                >
                  {t("deleteConfirmButton")}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  className="border-red-600 text-red-600 hover:bg-red-50"
                  onClick={() => setConfirmingDelete(true)}
                >
                  {t("deleteList")}
                </Button>
              )}
            </div>
          ) : canClone ? (
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              onClick={() => clone.mutate({ listId })}
              disabled={clone.isPending}
            >
              {t("cloneList")}
            </Button>
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {items.map((game) => (
          <div key={game.id} className="flex flex-col gap-2">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md border border-border bg-muted">
              {game.coverUrl ? (
                <Image
                  src={game.coverUrl}
                  alt={game.title}
                  fill
                  sizes="(max-width: 768px) 45vw, 160px"
                  className="object-cover"
                />
              ) : null}
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => removeGame.mutate({ listId, gameId: game.id })}
                  aria-label={t("removeGame")}
                  className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-background/80 text-foreground hover:bg-background"
                >
                  ×
                </button>
              ) : null}
            </div>
            <Link href={`/games/${game.slug}`} prefetch={false} className="truncate text-sm font-medium hover:underline">
              {game.title}
            </Link>
          </div>
        ))}

        {canEdit ? (
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-accent hover:text-foreground"
          >
            {t("addGame")}
          </button>
        ) : null}
      </div>

      {picking ? (
        <div className="flex flex-col gap-2 rounded-md border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="button"
              onClick={() => {
                setPicking(false);
                setQuery("");
              }}
              className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
            >
              {t("cancel")}
            </button>
          </div>

          {results && results.length > 0 ? (
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
              {results
                .filter((game) => !items.some((item) => item.id === game.id))
                .map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => addGame.mutate({ listId, gameId: game.id })}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    <div className="relative h-10 w-8 shrink-0 overflow-hidden rounded border border-border bg-muted">
                      {game.coverUrl ? (
                        <Image src={game.coverUrl} alt={game.title} fill sizes="32px" className="object-cover" />
                      ) : null}
                    </div>
                    {game.title}
                    {game.releaseYear ? (
                      <span className="text-muted-foreground">({game.releaseYear})</span>
                    ) : null}
                  </button>
                ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
