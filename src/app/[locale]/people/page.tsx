import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PeopleView } from "@/app/[locale]/people/people-view";
import { pageAlternates } from "@/lib/alternates";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "People" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: pageAlternates(locale, "/people"),
  };
}

export default function PeoplePage() {
  return <PeopleView />;
}
