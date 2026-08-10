import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site";
import { routing } from "@/i18n/routing";

// English is served under /en, French (the default locale) has no prefix.
function localizedUrls(path: string) {
  return Object.fromEntries(
    routing.locales.map((locale) => [
      locale,
      locale === routing.defaultLocale ? `${siteUrl}${path}` : `${siteUrl}/${locale}${path}`,
    ]),
  );
}

// One <url> block per locale, each listing every locale (including itself)
// as an hreflang alternate — the reciprocal structure Google's own sitemap
// hreflang docs show. A single default-locale entry with alternates only
// pointing outward (the previous approach here) never gave the /en pages
// their own <url> block at all, which isn't the documented format.
function entries(path: string, rest: Omit<MetadataRoute.Sitemap[number], "url" | "alternates">): MetadataRoute.Sitemap {
  const urls = localizedUrls(path);
  return routing.locales.map((locale) => ({
    url: urls[locale],
    alternates: { languages: urls },
    ...rest,
  }));
}

// The sitemap protocol's W3C-DTF profile only defines second precision —
// Date's default toISOString() includes milliseconds, which some sitemap
// parsers (reportedly including Google's) reject as non-conformant even
// though the file is still well-formed XML.
function toSitemapDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

// Regenerate at most once an hour instead of hitting Postgres on every
// crawler request — cheaper, and removes a possible source of intermittent
// failures (e.g. a cold start or connection-limit hiccup on the DB) right
// when a crawler happens to fetch it.
export const revalidate = 3600;

type GameRow = { slug: string; updatedAt: Date };
type UserRow = { username: string | null; updatedAt: Date };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // A DB hiccup here (cold start, connection limit) must never turn into a
  // 500 for the whole route — Google Search Console reads that as "sitemap
  // unreachable" and can take a while to re-check, unlike a normal page
  // where a user would just retry. Falling back to the static entries below
  // keeps the sitemap fetchable either way. $transaction also means this
  // costs one DB connection instead of two concurrent ones.
  const [games, users]: [GameRow[], UserRow[]] = await prisma
    .$transaction([
      // Only list games at least one person has actually logged — keeps
      // search-only imports (which can be noisy, especially for common
      // search terms) out of the public sitemap.
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
