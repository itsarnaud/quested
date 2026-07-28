import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import type { DiscordProfile } from "next-auth/providers/discord";
import { prisma } from "@/lib/prisma";
import { generateUniqueUsername } from "@/server/user/username";

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
    },
  },
});
