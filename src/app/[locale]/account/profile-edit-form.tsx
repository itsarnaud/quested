"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { uploadAvatar } from "@/app/[locale]/account/actions";
import { PublicVisibilityToggle } from "@/app/[locale]/account/public-visibility-toggle";
import { SteamIcon } from "@/components/icons/steam-icon";
import { DiscordIcon } from "@/components/icons/discord-icon";

type Profile = {
  name: string | null;
  username: string | null;
  bio: string | null;
  image: string | null;
  website: string | null;
  twitterUrl: string | null;
  twitchUrl: string | null;
  youtubeUrl: string | null;
};

export function ProfileEditForm({
  initialProfile,
  hasSteamLinked,
  hasDiscordLinked,
}: {
  initialProfile: Profile;
  hasSteamLinked: boolean;
  hasDiscordLinked: boolean;
}) {
  const t = useTranslations("Account");
  const router = useRouter();

  const [name, setName] = useState(initialProfile.name ?? "");
  const [username, setUsername] = useState(initialProfile.username ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [website, setWebsite] = useState(initialProfile.website ?? "");
  const [twitterUrl, setTwitterUrl] = useState(initialProfile.twitterUrl ?? "");
  const [twitchUrl, setTwitchUrl] = useState(initialProfile.twitchUrl ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(initialProfile.youtubeUrl ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.image);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      setSaved(true);
      setError(null);
      router.refresh();
    },
    onError: (err) => {
      setSaved(false);
      setError(err.data?.code === "CONFLICT" ? t("usernameTaken") : t("genericError"));
    },
  });

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const result = await uploadAvatar(formData);
      setAvatarUrl(result.url);
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-medium">{t("profileTitle")}</h2>

      <div className="flex items-center gap-4">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={name} fill unoptimized className="object-cover" />
          ) : null}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={avatarUploading}
        >
          {t("avatarButton")}
        </Button>
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          updateProfile.mutate({ name, username, bio, website, twitterUrl, twitchUrl, youtubeUrl });
        }}
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm text-muted-foreground">
            {t("nameLabel")}
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="username" className="text-sm text-muted-foreground">
            {t("usernameLabel")}
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent"
          />
          <p className="text-xs text-muted-foreground">{t("usernameInvalid")}</p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="bio" className="text-sm text-muted-foreground">
            {t("bioLabel")}
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t("bioPlaceholder")}
            maxLength={280}
            rows={3}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="mt-2 flex flex-col gap-3 border-t border-border pt-4">
          <h3 className="text-sm font-medium">{t("linksTitle")}</h3>

          <div className="flex flex-col gap-1">
            <label htmlFor="website" className="text-sm text-muted-foreground">
              {t("websiteLabel")}
            </label>
            <input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://…"
              className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="twitterUrl" className="text-sm text-muted-foreground">
              {t("twitterLabel")}
            </label>
            <input
              id="twitterUrl"
              type="url"
              value={twitterUrl}
              onChange={(e) => setTwitterUrl(e.target.value)}
              placeholder="https://x.com/…"
              className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="twitchUrl" className="text-sm text-muted-foreground">
              {t("twitchLabel")}
            </label>
            <input
              id="twitchUrl"
              type="url"
              value={twitchUrl}
              onChange={(e) => setTwitchUrl(e.target.value)}
              placeholder="https://twitch.tv/…"
              className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="youtubeUrl" className="text-sm text-muted-foreground">
              {t("youtubeLabel")}
            </label>
            <input
              id="youtubeUrl"
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/@…"
              className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {saved && !error ? <p className="text-sm text-muted-foreground">{t("saved")}</p> : null}

        <Button type="submit" className="w-fit" disabled={updateProfile.isPending}>
          {t("saveButton")}
        </Button>
      </form>

      {hasSteamLinked || hasDiscordLinked ? (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <h3 className="text-sm font-medium">{t("publicAccountsTitle")}</h3>

          {hasSteamLinked ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm">
                <SteamIcon />
                Steam
              </div>
              <PublicVisibilityToggle provider="steam" />
            </div>
          ) : null}

          {hasDiscordLinked ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm">
                <DiscordIcon />
                Discord
              </div>
              <PublicVisibilityToggle provider="discord" />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
