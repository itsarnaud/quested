"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function UnlinkButton({ label, confirmLabel }: { label: string; confirmLabel: string }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <Button
        key="confirm"
        type="submit"
        variant="secondary"
        className="rounded-full border-red-500/40 text-red-400 hover:bg-red-500/10"
      >
        {confirmLabel}
      </Button>
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
