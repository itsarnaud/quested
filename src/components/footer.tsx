import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function Footer() {
  const t = await getTranslations("Footer");

  return (
    <footer className="flex h-12 items-center justify-center gap-4 border-t border-border px-6 text-xs text-muted-foreground">
      <Link href="/mentions-legales" className="hover:text-foreground">
        {t("legal")}
      </Link>
      <Link href="/confidentialite" className="hover:text-foreground">
        {t("privacy")}
      </Link>
    </footer>
  );
}
