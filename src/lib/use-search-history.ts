"use client";

import { useRef, useState } from "react";
import {
  addSearchHistoryEntry,
  clearSearchHistory,
  getSearchHistory,
  removeSearchHistoryEntry,
} from "@/lib/search-history";

export function useSearchHistory(scope: string) {
  const [terms, setTerms] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onFocus = () => {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setTerms(getSearchHistory(scope));
    setOpen(true);
  };

  const onBlur = () => {
    blurTimeout.current = setTimeout(() => setOpen(false), 120);
  };

  const commit = (term: string) => {
    setTerms(addSearchHistoryEntry(scope, term));
  };

  const remove = (term: string) => {
    setTerms(removeSearchHistoryEntry(scope, term));
  };

  const clear = () => {
    setTerms(clearSearchHistory(scope));
  };

  return { terms, open, setOpen, onFocus, onBlur, commit, remove, clear };
}
