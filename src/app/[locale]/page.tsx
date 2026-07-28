import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const t = await getTranslations("Home");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-md flex-col gap-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Quested</h1>
        <p className="text-muted-foreground">{t("tagline")}</p>
        <div className="flex justify-center gap-3">
          <Link href="/search">
            <Button>{t("getStarted")}</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary">{t("signIn")}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
