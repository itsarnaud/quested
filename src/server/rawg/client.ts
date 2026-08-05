const API_URL = "https://api.rawg.io/api";

// RAWG occasionally hangs behind Cloudflare for 20s+ before erroring — this
// keeps a dead RAWG from stalling the whole search request.
const FETCH_TIMEOUT_MS = 5_000;

export type RawgGame = {
  id: number;
  name: string;
  released: string | null; // "YYYY-MM-DD"
  background_image: string | null;
  genres?: { name: string }[];
  platforms?: { platform: { name: string } }[];
  developers?: { name: string }[];
};

export async function searchRawgGames(query: string, limit = 20): Promise<RawgGame[]> {
  const params = new URLSearchParams({
    key: process.env.RAWG_API_KEY!,
    search: query,
    page_size: String(limit),
  });

  const res = await fetch(`${API_URL}/games?${params.toString()}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`RAWG search failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { results: RawgGame[] };
  return data.results;
}

export async function getRawgGameById(id: number): Promise<RawgGame | null> {
  const params = new URLSearchParams({ key: process.env.RAWG_API_KEY! });

  const res = await fetch(`${API_URL}/games/${id}?${params.toString()}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`RAWG game fetch failed: ${res.status} ${await res.text()}`);
  }

  return (await res.json()) as RawgGame;
}
