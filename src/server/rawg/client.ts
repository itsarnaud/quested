const API_URL = "https://api.rawg.io/api";

export type RawgGame = {
  id: number;
  name: string;
  released: string | null; // "YYYY-MM-DD"
  background_image: string | null;
  genres?: { name: string }[];
  platforms?: { platform: { name: string } }[];
};

export async function searchRawgGames(query: string, limit = 20): Promise<RawgGame[]> {
  const params = new URLSearchParams({
    key: process.env.RAWG_API_KEY!,
    search: query,
    page_size: String(limit),
  });

  const res = await fetch(`${API_URL}/games?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`RAWG search failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { results: RawgGame[] };
  return data.results;
}
