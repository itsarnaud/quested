import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GithubIcon } from "@/components/icons/github-icon";

const GITHUB_URL = "https://github.com/itsarnaud/quested";

export async function Footer() {
  const t = await getTranslations("Footer");

  return (
    <footer className="flex min-h-12 flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-border px-6 py-3 text-xs text-muted-foreground">
      <Link href="/a-propos" className="whitespace-nowrap hover:text-foreground">
        {t("about")}
      </Link>
      <Link href="/changelog" className="whitespace-nowrap hover:text-foreground">
        {t("changelog")}
      </Link>
      <Link href="/mentions-legales" className="whitespace-nowrap hover:text-foreground">
        {t("legal")}
      </Link>
      <Link href="/confidentialite" className="whitespace-nowrap hover:text-foreground">
        {t("privacy")}
      </Link>
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("github")}
        title={t("github")}
        className="hover:text-foreground"
      >
        <GithubIcon />
      </a>
    </footer>
  );
}
