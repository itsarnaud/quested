"use client";

import { useRouter } from "@/i18n/navigation";

export function BackLink({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="w-fit text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      ‹ {label}
    </button>
  );
}
