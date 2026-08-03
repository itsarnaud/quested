"use client";

import { useEffect } from "react";
import { toast } from "sonner";

// For server-rendered pages that signal a one-time result via a URL query
// param (e.g. after an external redirect) — fires the toast once, then
// strips the param so a refresh doesn't show it again.
export function ToastOnMount({
  message,
  variant = "success",
  paramToStrip,
}: {
  message: string;
  variant?: "success" | "error";
  paramToStrip?: string;
}) {
  useEffect(() => {
    if (variant === "success") toast.success(message);
    else toast.error(message);

    if (paramToStrip) {
      const url = new URL(window.location.href);
      url.searchParams.delete(paramToStrip);
      window.history.replaceState({}, "", url);
    }
  }, [message, variant, paramToStrip]);

  return null;
}
