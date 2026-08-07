"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

export function PsnTokenForm() {
  const router = useRouter();
  const [npsso, setNpsso] = useState("");

  const setToken = trpc.admin.setPsnToken.useMutation({
    onSuccess: ({ refreshTokenExpiresInDays }) => {
      toast.success(`Token enregistré, valide ~${refreshTokenExpiresInDays} jours.`);
      setNpsso("");
      router.refresh();
    },
    onError: () => toast.error("Échange NPSSO échoué — le token a peut-être déjà expiré, réessaie."),
  });

  return (
    <div className="flex flex-col gap-3">
      <a
        href="https://ca.account.sony.com/api/v1/ssocookie"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-accent hover:underline"
      >
        Récupérer un NPSSO (connecte-toi sur playstation.com d&apos;abord)
      </a>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (npsso.trim()) setToken.mutate({ npsso: npsso.trim() });
        }}
      >
        <textarea
          value={npsso}
          onChange={(e) => setNpsso(e.target.value)}
          placeholder="Colle la valeur npsso ici"
          rows={3}
          className="w-full resize-none rounded-md border border-border bg-card px-3 py-2 font-mono text-xs outline-none transition-shadow focus:ring-2 focus:ring-accent"
        />
        <Button type="submit" className="w-full" disabled={!npsso.trim()} isLoading={setToken.isPending}>
          Enregistrer le token
        </Button>
      </form>
    </div>
  );
}
