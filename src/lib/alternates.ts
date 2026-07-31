import { siteUrl } from "@/lib/site";
import { routing } from "@/i18n/routing";

// English is served under /en, French (the default locale) has no prefix —
// same convention as sitemap.ts. Use in generateMetadata to emit a
// canonical link and hreflang alternates for a given locale + path.
export function pageAlternates(locale: string, path: string) {
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, l === routing.defaultLocale ? `${siteUrl}${path}` : `${siteUrl}/${l}${path}`]),
  );

  return {
    canonical: languages[locale as (typeof routing.locales)[number]] ?? languages[routing.defaultLocale],
    languages,
  };
}
