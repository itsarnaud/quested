import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import type { DiscordProfile } from "next-auth/providers/discord";
import { prisma } from "@/lib/prisma";
import { generateUniqueUsername } from "@/server/user/username";
import { sendEmail } from "@/lib/mailer";
import { renderWelcomeEmail } from "@/lib/email-templates";

// Discord's default profile() picks .gif for animated avatars, which
// this CDN edge rejects with a 415. Force .png (static) instead.
const discordProvider = Discord({
  profile(profile: DiscordProfile) {
    const imageUrl =
      profile.avatar === null
        ? `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(profile.id) >> BigInt(22)) % 6}.png`
        : `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`;

    return {
      id: profile.id,
      name: profile.global_name ?? profile.username,
      email: profile.email,
      image: imageUrl,
    };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Vercel sits in front as a proxy — without this, Auth.js can mis-resolve
  // the host/protocol on the OAuth callback, which is one known cause of
  // "pkceCodeVerifier could not be parsed" errors.
  trustHost: true,
  providers: [Google, discordProvider],
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.username = user.username ?? null;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      const username = await generateUniqueUsername(user.name ?? user.email ?? user.id ?? "player");
      await prisma.user.update({ where: { id: user.id }, data: { username } });

      if (user.email) {
        const { subject, html } = renderWelcomeEmail();
        sendEmail({ to: user.email, subject, html }).catch((err) =>
          console.error("Failed to send welcome email:", err),
        );
      }
    },
    async linkAccount({ account, profile }) {
      const providerLabel = account.provider === "discord" ? profile.name : (profile.email ?? profile.name);
      if (!providerLabel) return;

      await prisma.account.update({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
        data: { providerLabel },
      });
    },
  },
});
