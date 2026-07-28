"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { uploadAvatar } from "@/app/[locale]/account/actions";

type Profile = {
  name: string | null;
  username: string | null;
  bio: string | null;
  image: string | null;
};

export function ProfileEditForm({ initialProfile }: { initialProfile: Profile }) {
  const t = useTranslations("Account");
  const router = useRouter();

  const [name, setName] = useState(initialProfile.name ?? "");
  const [username, setUsername] = useState(initialProfile.username ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
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
          updateProfile.mutate({ name, username, bio });
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
            className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
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
            pattern="[a-z0-9-]{3,20}"
            className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
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
            className="rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {saved && !error ? <p className="text-sm text-muted-foreground">{t("saved")}</p> : null}

        <Button type="submit" className="w-fit" disabled={updateProfile.isPending}>
          {t("saveButton")}
        </Button>
      </form>
    </div>
  );
}
