import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileEditForm } from "@/app/[locale]/account/profile-edit-form";

export async function ProfileSection() {
  const session = await auth();
  if (!session?.user) return null;

  const [profile, accounts] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: {
        name: true,
        username: true,
        bio: true,
        image: true,
        website: true,
        twitterUrl: true,
        twitchUrl: true,
        youtubeUrl: true,
        showSteamOnProfile: true,
        showDiscordOnProfile: true,
        showPsnOnProfile: true,
      },
    }),
    prisma.account.findMany({
      where: { userId: session.user.id, provider: { in: ["steam", "discord", "psn"] } },
      select: { provider: true },
    }),
  ]);

  const linkedProviders = new Set(accounts.map((a) => a.provider));

  return (
    <ProfileEditForm
      initialProfile={profile}
      hasSteamLinked={linkedProviders.has("steam")}
      hasDiscordLinked={linkedProviders.has("discord")}
      hasPsnLinked={linkedProviders.has("psn")}
    />
  );
}
