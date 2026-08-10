"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

export function XboxLinkForm({ className = "flex w-full gap-2 sm:w-auto" }: { className?: string }) {
  const t = useTranslations("Account");
  const router = useRouter();
  const [gamertag, setGamertag] = useState("");

  const preview = trpc.xbox.preview.useMutation({
    onError: (err) => {
      if (err.data?.code === "INTERNAL_SERVER_ERROR" || err.data?.code === "TOO_MANY_REQUESTS") {
        toast.error(t("genericError"));
      } else {
        toast.error(t("xboxNotFound"));
      }
    },
  });
  const link = trpc.xbox.link.useMutation({
    onSuccess: () => {
      toast.success(t("saved"));
      preview.reset();
      router.refresh();
    },
    onError: (err) => {
      if (err.data?.code === "CONFLICT") toast.error(t("xboxAlreadyLinked"));
      else if (err.data?.code === "INTERNAL_SERVER_ERROR") toast.error(t("genericError"));
      else toast.error(t("xboxNotFound"));
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
              <span className="text-sm font-semibold">{profile.gamertag}</span>
              <span className="text-xs text-muted-foreground">
                {t("xboxPreviewStats", { games: profile.gamesCount, gamerscore: profile.gamerScore })}
              </span>
            </div>
            <p className="text-sm font-medium">{t("xboxConfirmPrompt")}</p>
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
                onClick={() => link.mutate({ gamertag })}
              >
                {t("psnConfirmYes")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <form
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          if (gamertag.trim()) preview.mutate({ gamertag: gamertag.trim() });
        }}
      >
        <input
          value={gamertag}
          onChange={(e) => setGamertag(e.target.value)}
          placeholder={t("xboxGamertagPlaceholder")}
          className="h-9 min-w-0 flex-1 rounded-md border border-border bg-card px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent sm:w-40"
        />
        <Button type="submit" className="shrink-0" disabled={!gamertag.trim()} isLoading={preview.isPending}>
          {t("linkXbox")}
        </Button>
      </form>
    </>
  );
}
