const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const API_URL = "https://api.igdb.com/v4";

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAppAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  const params = new URLSearchParams({
    client_id: process.env.IGDB_CLIENT_ID!,
    client_secret: process.env.IGDB_CLIENT_SECRET!,
    grant_type: "client_credentials",
  });

  const res = await fetch(`${TOKEN_URL}?${params.toString()}`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Failed to get IGDB app access token: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: data.access_token,
    // refresh a bit early to avoid edge-of-expiry failures
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.accessToken;
}

export type IgdbGame = {
  id: number;
  name: string;
  summary?: string;
  first_release_date?: number; // unix seconds
  cover?: { url: string };
  genres?: { name: string }[];
  platforms?: { name: string }[];
  involved_companies?: { company: { name: string }; developer: boolean }[];
};

const GAME_FIELDS =
  "name,summary,first_release_date,cover.url,genres.name,platforms.name,involved_companies.company.name,involved_companies.developer";

async function postGamesQuery(body: string): Promise<IgdbGame[]> {
  const token = await getAppAccessToken();

  const res = await fetch(`${API_URL}/games`, {
    method: "POST",
    headers: {
      "Client-ID": process.env.IGDB_CLIENT_ID!,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`IGDB query failed: ${res.status} ${await res.text()}`);
  }

  return (await res.json()) as IgdbGame[];
}

export async function searchIgdbGames(query: string, limit = 20): Promise<IgdbGame[]> {
  return postGamesQuery(
    `search "${query.replace(/"/g, '\\"')}"; fields ${GAME_FIELDS}; limit ${limit};`,
  );
}

export async function getIgdbGamesByIds(ids: number[]): Promise<IgdbGame[]> {
  if (ids.length === 0) return [];
  return postGamesQuery(`fields ${GAME_FIELDS}; where id = (${ids.join(",")}); limit ${ids.length};`);
}

export function toCoverUrl(cover?: { url: string }): string | null {
  if (!cover?.url) return null;
  // IGDB returns protocol-relative thumb URLs; upgrade to a larger size for display.
  return `https:${cover.url.replace("t_thumb", "t_cover_big")}`;
}

const EXTERNAL_GAMES_BATCH_SIZE = 50;

// IGDB's external_games table cross-references its own game ids against
// storefront ids — external_game_source id 1 is Steam (the old numeric
// `category` field was deprecated by IGDB and no longer filters anything),
// and `uid` there is the Steam appid. Used to match a user's Steam library
// against IGDB without any fuzzy title matching (Steam's own API gives us
// no release year to match on).
export async function resolveIgdbIdsBySteamAppIds(appIds: string[]): Promise<Map<string, number>> {
  const token = await getAppAccessToken();
  const result = new Map<string, number>();

  for (let i = 0; i < appIds.length; i += EXTERNAL_GAMES_BATCH_SIZE) {
    const batch = appIds.slice(i, i + EXTERNAL_GAMES_BATCH_SIZE);
    const uids = batch.map((id) => `"${id}"`).join(",");
    const res = await fetch(`${API_URL}/external_games`, {
      method: "POST",
      headers: {
        "Client-ID": process.env.IGDB_CLIENT_ID!,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body: `fields uid,game.id; where uid = (${uids}) & external_game_source = 1; limit ${batch.length};`,
    });

    if (!res.ok) {
      throw new Error(`IGDB external_games query failed: ${res.status} ${await res.text()}`);
    }

    const rows = (await res.json()) as { uid: string; game?: { id: number } }[];
    for (const row of rows) {
      if (row.game) result.set(row.uid, row.game.id);
    }
  }

  return result;
}
