import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalSections } from "@/components/legal-sections";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });
  return { title: t("title") };
}

export default async function AboutPage() {
  const t = await getTranslations("About");
  const sections = t.raw("sections") as { heading: string; body: string }[];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <LegalSections sections={sections} />
    </div>
  );
}
