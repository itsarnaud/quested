import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalSections } from "@/components/legal-sections";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Legal" });
  return { title: t("mentionsTitle") };
}

export default async function MentionsLegalesPage() {
  const t = await getTranslations("Legal");
  const sections = t.raw("mentionsSections") as { heading: string; body: string }[];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t("mentionsTitle")}</h1>
      <LegalSections sections={sections} />
    </div>
  );
}
