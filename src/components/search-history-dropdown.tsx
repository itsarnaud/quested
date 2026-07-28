"use client";

import { useTranslations } from "next-intl";

export function SearchHistoryDropdown({
  terms,
  onSelect,
  onRemove,
  onClear,
}: {
  terms: string[];
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
  onClear: () => void;
}) {
  const t = useTranslations("SearchHistory");

  if (terms.length === 0) return null;

  return (
    <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card p-2 shadow-sm">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">{t("recent")}</span>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {t("clear")}
        </button>
      </div>
      <div className="flex flex-col">
        {terms.map((term) => (
          <div key={term} className="flex items-center justify-between rounded px-1 py-1 hover:bg-muted">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(term)}
              className="flex-1 truncate text-left text-sm"
            >
              {term}
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onRemove(term)}
              className="px-2 text-xs text-muted-foreground hover:text-foreground"
              aria-label="remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
