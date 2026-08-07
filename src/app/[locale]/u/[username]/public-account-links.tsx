"use client";

import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { SteamIcon } from "@/components/icons/steam-icon";
import { DiscordIcon } from "@/components/icons/discord-icon";
import { PsnIcon } from "@/components/icons/psn-icon";
import { LinkIcon } from "@/components/icons/link-icon";
import { XIcon } from "@/components/icons/x-icon";
import { TwitchIcon } from "@/components/icons/twitch-icon";
import { YoutubeIcon } from "@/components/icons/youtube-icon";

export function PublicAccountLinks({
  steamId,
  discordUsername,
  psnUsername,
  website,
  twitterUrl,
  twitchUrl,
  youtubeUrl,
}: {
  steamId?: string;
  discordUsername?: string;
  psnUsername?: string;
  website?: string | null;
  twitterUrl?: string | null;
  twitchUrl?: string | null;
  youtubeUrl?: string | null;
}) {
  const t = useTranslations("Profile");

  if (!steamId && !discordUsername && !psnUsername && !website && !twitterUrl && !twitchUrl && !youtubeUrl) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {website ? (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          title={website}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <LinkIcon width={16} height={16} />
        </a>
      ) : null}
      {twitterUrl ? (
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="X"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <XIcon />
        </a>
      ) : null}
      {twitchUrl ? (
        <a
          href={twitchUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Twitch"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <TwitchIcon />
        </a>
      ) : null}
      {youtubeUrl ? (
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="YouTube"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <YoutubeIcon />
        </a>
      ) : null}
      {steamId ? (
        <a
          href={`https://steamcommunity.com/profiles/${steamId}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Steam"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <SteamIcon />
        </a>
      ) : null}
      {discordUsername ? (
        <button
          type="button"
          title={discordUsername}
          onClick={() => {
            navigator.clipboard.writeText(discordUsername);
            toast.success(t("discordCopied"));
          }}
          className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <DiscordIcon />
        </button>
      ) : null}
      {psnUsername ? (
        <button
          type="button"
          title={psnUsername}
          onClick={() => {
            navigator.clipboard.writeText(psnUsername);
            toast.success(t("psnCopied"));
          }}
          className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <PsnIcon />
        </button>
      ) : null}
    </div>
  );
}
