import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// TEMPORARY diagnostic sitemap — GSC has kept reporting "Impossible de lire
// le sitemap" (0 pages discovered) on fresh crawls despite the real sitemap
// passing every check we can run from outside (valid XML, valid UTF-8, no
// duplicates, correct Content-Type, no BOM, 200 over curl AND over Google's
// own URL Inspection live test). This strips the sitemap down to 2 static
// URLs with zero hreflang alternates, to find out via a real GSC re-crawl
// whether the rejection is about content (something in the ~1084-URL real
// sitemap) or something else entirely (GSC-side, domain-level).
//
// Revert this commit once GSC has re-read this version — see
// Quested - Historique technique.md for the full investigation and what to
// do with the result either way. The real implementation lives in git
// history (previous commit), don't rewrite it from scratch — just revert.
export const revalidate = 0;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/search`, changeFrequency: "weekly", priority: 0.8 },
  ];
}
