import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site";
import { routing } from "@/i18n/routing";

export const SITEMAP_IDS = ["static", "games", "users"] as const;
export type SitemapId = (typeof SITEMAP_IDS)[number];

type Entry = {
  url: string;
  lastModified?: string;
  changeFrequency: "weekly";
  priority: number;
};

function localizedUrls(path: string) {
  return routing.locales.map((locale) =>
    locale === routing.defaultLocale ? `${siteUrl}${path}` : `${siteUrl}/${locale}${path}`,
  );
}

// No xhtml:link hreflang alternates — those broke XML parsing in browsers
// (and likely GSC). The signal isn't lost: next-intl emits hreflang <link>
// tags in every page's own <head> already.
function entries(path: string, rest: Omit<Entry, "url">): Entry[] {
  return localizedUrls(path).map((url) => ({ url, ...rest }));
}

// The sitemap protocol only defines second precision; toISOString()'s
// milliseconds get rejected by some parsers as non-conformant.
function toSitemapDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function staticEntries(): Promise<Entry[]> {
  return [
    ...entries("", { changeFrequency: "weekly", priority: 1 }),
    ...entries("/search", { changeFrequency: "weekly", priority: 0.8 }),
  ];
}

async function gameEntries(): Promise<Entry[]> {
  // A DB hiccup here must never 500 the whole route — GSC reads that as
  // "sitemap unreachable". Fall back to an empty section instead.
  const games = await prisma.game
    .findMany({
      where: { logs: { some: {} } },
      select: { slug: true, updatedAt: true },
    })
    .catch((error) => {
      console.error("Sitemap games query failed, falling back to empty section:", error);
      return [];
    });

  return games.flatMap((game) =>
    entries(`/games/${game.slug}`, {
      lastModified: toSitemapDate(game.updatedAt),
      changeFrequency: "weekly",
      priority: 0.6,
    }),
  );
}

async function userEntries(): Promise<Entry[]> {
  const users = await prisma.user
    .findMany({
      where: { username: { not: null }, logs: { some: {} } },
      select: { username: true, updatedAt: true },
    })
    .catch((error) => {
      console.error("Sitemap users query failed, falling back to empty section:", error);
      return [];
    });

  return users.flatMap((user) =>
    entries(`/u/${user.username}`, {
      lastModified: toSitemapDate(user.updatedAt),
      changeFrequency: "weekly",
      priority: 0.5,
    }),
  );
}

export async function entriesFor(id: SitemapId): Promise<Entry[]> {
  switch (id) {
    case "static":
      return staticEntries();
    case "games":
      return gameEntries();
    case "users":
      return userEntries();
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderUrlset(items: Entry[]): string {
  const urls = items
    .map(
      (item) => `<url>
<loc>${escapeXml(item.url)}</loc>
${item.lastModified ? `<lastmod>${item.lastModified}</lastmod>\n` : ""}<changefreq>${item.changeFrequency}</changefreq>
<priority>${item.priority}</priority>
</url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export function renderSitemapIndex(): string {
  const sitemaps = SITEMAP_IDS.map((id) => `<sitemap><loc>${siteUrl}/sitemap/${id}.xml</loc></sitemap>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`;
}
