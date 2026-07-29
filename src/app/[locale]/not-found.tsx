import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LostIllustration } from "@/components/icons/lost-illustration";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <LostIllustration className="text-accent" />
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-accent">{t("eyebrow")}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <Link href="/">
        <Button>{t("backHome")}</Button>
      </Link>
    </div>
  );
}
