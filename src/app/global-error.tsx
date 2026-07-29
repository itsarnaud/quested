"use client";

import { useEffect } from "react";
import { Logo } from "@/components/icons/logo";
import "./[locale]/globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="min-h-full antialiased">
        <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-6 px-6 py-16 text-center">
          <Logo width={40} height={40} />
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Une erreur est survenue</h1>
            <p className="text-muted-foreground">
              Quelque chose s&apos;est mal passé de notre côté. Réessaie, ou reviens plus tard.
            </p>
            {error.digest ? (
              <p className="text-xs text-muted-foreground">Référence : {error.digest}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
