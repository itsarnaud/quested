"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { DeadIllustration } from "@/components/icons/dead-illustration";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("ErrorPage");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <DeadIllustration className="text-accent" />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">{t("digestLabel", { digest: error.digest })}</p>
        ) : null}
      </div>
      <div className="flex justify-center gap-3">
        <Button onClick={reset}>{t("retry")}</Button>
        <Link href="/">
          <Button variant="secondary">{t("backHome")}</Button>
        </Link>
      </div>
    </div>
  );
}
