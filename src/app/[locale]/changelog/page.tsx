import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { fetchReleases } from "@/lib/github-releases";
import { renderReleaseNotesHtml } from "@/lib/render-release-notes";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Changelog" });
  return { title: t("title") };
}

export default async function ChangelogPage() {
  const t = await getTranslations("Changelog");
  const locale = await getLocale();
  const releases = await fetchReleases();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {releases.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-8">
          {releases.map((release) => (
            <article key={release.tagName} className="flex flex-col gap-3 border-b border-border pb-8 last:border-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-lg font-semibold tracking-tight">{release.name}</h2>
                {release.publishedAt ? (
                  <time dateTime={release.publishedAt} className="text-xs text-muted-foreground">
                    {new Date(release.publishedAt).toLocaleDateString(locale, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                ) : null}
              </div>
              <div
                className="release-notes flex flex-col gap-2 text-sm text-muted-foreground [&_h2]:text-sm [&_h2]:font-medium [&_h2]:text-foreground [&_li]:ml-4 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1"
                dangerouslySetInnerHTML={{ __html: renderReleaseNotesHtml(release.body) }}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
