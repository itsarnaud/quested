"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type UnlinkState = { error: boolean } | null;

export function UnlinkButton({
  label,
  confirmLabel,
  action,
}: {
  label: string;
  confirmLabel: string;
  action: (prevState: UnlinkState, formData: FormData) => Promise<UnlinkState>;
}) {
  const t = useTranslations("Account");
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (state === null) return;
    if (state.error) toast.error(t("genericError"));
    else toast.success(t("unlinked"));
  }, [state, t]);

  if (confirming) {
    return (
      <form action={formAction}>
        <Button
          key="confirm"
          type="submit"
          variant="secondary"
          className="rounded-full border-red-500/40 text-red-400 hover:bg-red-500/10"
          disabled={isPending}
        >
          {confirmLabel}
        </Button>
      </form>
    );
  }

  return (
    <Button
      key="initial"
      type="button"
      variant="secondary"
      className="rounded-full"
      onClick={() => setConfirming(true)}
    >
      {label}
    </Button>
  );
}
