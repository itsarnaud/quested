"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

export function PsnLinkForm() {
  const t = useTranslations("Account");
  const router = useRouter();
  const [username, setUsername] = useState("");

  const preview = trpc.psn.preview.useMutation({
    onError: (err) => {
      if (err.data?.code === "INTERNAL_SERVER_ERROR") toast.error(t("genericError"));
      else toast.error(t("psnNotFound"));
    },
  });
  const link = trpc.psn.link.useMutation({
    onSuccess: () => {
      toast.success(t("saved"));
      preview.reset();
      router.refresh();
    },
    onError: (err) => {
      if (err.data?.code === "CONFLICT") toast.error(t("psnAlreadyLinked"));
      else if (err.data?.code === "INTERNAL_SERVER_ERROR") toast.error(t("genericError"));
      else toast.error(t("psnNotFound"));
    },
  });

  const profile = preview.data;

  return (
    <>
      {profile ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 text-center">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
              {profile.avatarUrl ? (
                <Image src={profile.avatarUrl} alt="" fill unoptimized className="object-cover" />
              ) : null}
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-sm font-semibold">{profile.onlineId}</span>
              <span className="text-xs text-muted-foreground">
                {t("psnPreviewStats", {
                  games: profile.gamesCount,
                  trophies:
                    profile.earnedTrophies.platinum +
                    profile.earnedTrophies.gold +
                    profile.earnedTrophies.silver +
                    profile.earnedTrophies.bronze,
                })}
              </span>
            </div>
            <p className="text-sm font-medium">{t("psnConfirmPrompt")}</p>
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => preview.reset()}
                disabled={link.isPending}
              >
                {t("psnConfirmNo")}
              </Button>
              <Button
                type="button"
                className="flex-1"
                isLoading={link.isPending}
                onClick={() => link.mutate({ username })}
              >
                {t("psnConfirmYes")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <form
        className="flex w-full gap-2 sm:w-auto"
        onSubmit={(e) => {
          e.preventDefault();
          if (username.trim()) preview.mutate({ username: username.trim() });
        }}
      >
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={t("psnUsernamePlaceholder")}
          className="h-9 min-w-0 flex-1 rounded-md border border-border bg-card px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent sm:w-40"
        />
        <Button
          type="submit"
          className="shrink-0 rounded-full"
          disabled={!username.trim()}
          isLoading={preview.isPending}
        >
          {t("linkPsn")}
        </Button>
      </form>
    </>
  );
}
