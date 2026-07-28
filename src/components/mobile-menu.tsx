"use client";

import { useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function MobileMenu({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Remounting on navigation resets `open` back to false, instead of
  // reaching for a setState-in-effect to close the menu on route change.
  return <MobileMenuPanel key={pathname}>{children}</MobileMenuPanel>;
}

function MobileMenuPanel({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        className="relative flex size-9 flex-col items-center justify-center gap-1.5 rounded-md hover:bg-muted"
      >
        <span
          className={cn(
            "h-0.5 w-5 bg-current transition-transform duration-300 ease-out",
            open && "translate-y-2 rotate-45",
          )}
        />
        <span
          className={cn(
            "h-0.5 w-5 bg-current transition-opacity duration-200 ease-out",
            open && "opacity-0",
          )}
        />
        <span
          className={cn(
            "h-0.5 w-5 bg-current transition-transform duration-300 ease-out",
            open && "-translate-y-2 -rotate-45",
          )}
        />
      </button>

      <div
        className={cn(
          "absolute inset-x-0 top-14 z-50 flex origin-top flex-col gap-4 border-b border-border bg-background px-6 py-4 transition-all duration-200 ease-out",
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
      >
        {children}
      </div>
    </div>
  );
}
