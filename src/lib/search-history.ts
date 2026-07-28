const MAX_ENTRIES = 6;

function storageKey(scope: string) {
  return `quested:search-history:${scope}`;
}

export function getSearchHistory(scope: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addSearchHistoryEntry(scope: string, term: string): string[] {
  const trimmed = term.trim();
  if (!trimmed) return getSearchHistory(scope);
  const next = [
    trimmed,
    ...getSearchHistory(scope).filter((t) => t.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(storageKey(scope), JSON.stringify(next));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — history just won't persist
  }
  return next;
}

export function removeSearchHistoryEntry(scope: string, term: string): string[] {
  const next = getSearchHistory(scope).filter((t) => t !== term);
  try {
    window.localStorage.setItem(storageKey(scope), JSON.stringify(next));
  } catch {
    // localStorage unavailable — nothing to persist
  }
  return next;
}

export function clearSearchHistory(scope: string): string[] {
  try {
    window.localStorage.removeItem(storageKey(scope));
  } catch {
    // localStorage unavailable — nothing to clear
  }
  return [];
}
