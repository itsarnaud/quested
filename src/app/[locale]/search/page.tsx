import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SearchView } from "@/app/[locale]/search/search-view";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Search" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function SearchPage() {
  return <SearchView />;
}
