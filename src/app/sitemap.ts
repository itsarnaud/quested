import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site";
import { routing } from "@/i18n/routing";

function localizedUrls(path: string) {
  return routing.locales.map((locale) =>
    locale === routing.defaultLocale ? `${siteUrl}${path}` : `${siteUrl}/${locale}${path}`,
  );
}

// No xhtml:link hreflang alternates — those broke XML parsing in browsers
// (and likely GSC). The signal isn't lost: next-intl emits hreflang <link>
// tags in every page's own <head> already.
function entries(path: string, rest: Omit<MetadataRoute.Sitemap[number], "url">): MetadataRoute.Sitemap {
  return localizedUrls(path).map((url) => ({ url, ...rest }));
}

// The sitemap protocol only defines second precision; toISOString()'s
// milliseconds get rejected by some parsers as non-conformant.
function toSitemapDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export const revalidate = 3600;

type GameRow = { slug: string; updatedAt: Date };
type UserRow = { username: string | null; updatedAt: Date };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // A DB hiccup here must never 500 the whole route — GSC reads that as
  // "sitemap unreachable". Fall back to the static entries below instead.
  const [games, users]: [GameRow[], UserRow[]] = await prisma
    .$transaction([
      prisma.game.findMany({
        where: { logs: { some: {} } },
        select: { slug: true, updatedAt: true },
      }),
      prisma.user.findMany({
        where: { username: { not: null }, logs: { some: {} } },
        select: { username: true, updatedAt: true },
      }),
    ])
    .catch((error) => {
      console.error("Sitemap DB query failed, falling back to static entries:", error);
      return [[], []];
    });

  return [
    ...entries("", { changeFrequency: "weekly", priority: 1 }),
    ...entries("/search", { changeFrequency: "weekly", priority: 0.8 }),
    ...games.flatMap((game) =>
      entries(`/games/${game.slug}`, {
        lastModified: toSitemapDate(game.updatedAt),
        changeFrequency: "weekly",
        priority: 0.6,
      }),
    ),
    ...users.flatMap((user) =>
      entries(`/u/${user.username}`, {
        lastModified: toSitemapDate(user.updatedAt),
        changeFrequency: "weekly",
        priority: 0.5,
      }),
    ),
  ];
}
