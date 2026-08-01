// Steam authentication is OpenID 2.0, not OAuth2/OIDC, so it can't go
// through Auth.js's provider abstraction (confirmed: @auth/core's OAuth
// client unconditionally requires an authorization `code`, which OpenID 2.0
// callbacks never have). This is a small, self-contained OpenID 2.0 relying
// party implementation instead, used only to *link* a Steam account onto an
// already-authenticated session — never to create one.

const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";
const CLAIMED_ID_PATTERN = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/;

export function getSteamAuthorizationUrl(returnTo: string): URL {
  const realm = new URL(returnTo).origin;
  const url = new URL(STEAM_OPENID_URL);
  url.searchParams.set("openid.mode", "checkid_setup");
  url.searchParams.set("openid.ns", "http://specs.openid.net/auth/2.0");
  url.searchParams.set("openid.identity", "http://specs.openid.net/auth/2.0/identifier_select");
  url.searchParams.set("openid.claimed_id", "http://specs.openid.net/auth/2.0/identifier_select");
  url.searchParams.set("openid.return_to", returnTo);
  url.searchParams.set("openid.realm", realm);
  return url;
}

// Verifies Steam's signed OpenID response server-to-server (the actual
// security check — anyone can craft the callback query params, but only
// Steam can make `check_authentication` come back `is_valid:true` for them).
// Returns the verified SteamID64, or null if anything doesn't check out.
export async function verifySteamAssertion(params: URLSearchParams, returnTo: string): Promise<string | null> {
  if (
    params.get("openid.op_endpoint") !== STEAM_OPENID_URL ||
    params.get("openid.ns") !== "http://specs.openid.net/auth/2.0"
  ) {
    return null;
  }

  const claimedId = params.get("openid.claimed_id") ?? "";
  const identity = params.get("openid.identity") ?? "";
  if (!claimedId.startsWith("https://steamcommunity.com/openid/id/")) return null;
  if (!identity.startsWith("https://steamcommunity.com/openid/id/")) return null;
  if (params.get("openid.return_to") !== returnTo) return null;

  const verifyParams = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (key === "openid.mode") continue;
    verifyParams.set(key, value);
  }
  verifyParams.set("openid.mode", "check_authentication");

  const response = await fetch(STEAM_OPENID_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verifyParams.toString(),
  });
  if (!response.ok) return null;

  const text = await response.text();
  if (!/is_valid\s*:\s*true/i.test(text)) return null;

  const match = claimedId.match(CLAIMED_ID_PATTERN);
  return match ? match[1] : null;
}

export type SteamOwnedGame = { appid: number; name: string; playtimeMinutes: number };

// Steam's response omits the `games` key entirely for a private profile
// (no error, no clue otherwise) — returning `null` here specifically lets
// callers tell "private profile" apart from "public but owns 0 games".
export async function getSteamOwnedGames(steamId: string): Promise<SteamOwnedGame[] | null> {
  const url = new URL("https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001");
  url.searchParams.set("key", process.env.AUTH_STEAM_SECRET!);
  url.searchParams.set("steamid", steamId);
  url.searchParams.set("include_appinfo", "1");
  url.searchParams.set("include_played_free_games", "1");

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Steam API error: ${response.status}`);

  const data = (await response.json()) as {
    response?: { game_count?: number; games?: { appid: number; name: string; playtime_forever: number }[] };
  };
  if (!data.response?.games) return null;

  return data.response.games.map((g) => ({
    appid: g.appid,
    name: g.name,
    playtimeMinutes: g.playtime_forever,
  }));
}

export type SteamAchievementSchema = {
  apiName: string;
  displayName: string;
  description: string | null;
  iconUrl: string;
  iconGrayUrl: string;
};

// Most Steam apps have no achievements/stats at all — that's the normal
// case, not an error, so this returns [] instead of throwing whenever the
// response doesn't have the shape of a real achievement schema.
export async function getSteamGameSchema(appid: number): Promise<SteamAchievementSchema[]> {
  const url = new URL("https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2");
  url.searchParams.set("key", process.env.AUTH_STEAM_SECRET!);
  url.searchParams.set("appid", String(appid));

  const response = await fetch(url);
  if (!response.ok) return [];

  const data = (await response.json()) as {
    game?: {
      availableGameStats?: {
        achievements?: {
          name: string;
          displayName: string;
          description?: string;
          icon: string;
          icongray: string;
        }[];
      };
    };
  };

  const achievements = data.game?.availableGameStats?.achievements ?? [];
  return achievements.map((a) => ({
    apiName: a.name,
    displayName: a.displayName,
    description: a.description ?? null,
    iconUrl: a.icon,
    iconGrayUrl: a.icongray,
  }));
}

export async function getSteamGlobalAchievementPercentages(appid: number): Promise<Map<string, number>> {
  const url = new URL("https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2");
  url.searchParams.set("gameid", String(appid));

  const response = await fetch(url);
  if (!response.ok) return new Map();

  const data = (await response.json()) as {
    achievementpercentages?: { achievements?: { name: string; percent: number | string }[] };
  };
  const rows = data.achievementpercentages?.achievements ?? [];
  // Steam's own API is inconsistent about whether `percent` comes back as a
  // JSON number or a numeric string — coerce explicitly rather than trust it.
  return new Map(rows.map((r) => [r.name, Number(r.percent)]));
}

export type SteamPlayerAchievement = { apiName: string; achieved: boolean; unlockedAt: Date | null };

// Returns [] both for games with no stats and for a private profile — the
// caller already knows which games it's asking about (from a prior owned
// games fetch), so there's nothing actionable to distinguish here.
export async function getSteamPlayerAchievements(steamId: string, appid: number): Promise<SteamPlayerAchievement[]> {
  const url = new URL("https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1");
  url.searchParams.set("key", process.env.AUTH_STEAM_SECRET!);
  url.searchParams.set("steamid", steamId);
  url.searchParams.set("appid", String(appid));

  const response = await fetch(url);
  if (!response.ok) return [];

  const data = (await response.json()) as {
    playerstats?: { success?: boolean; achievements?: { apiname: string; achieved: number; unlocktime: number }[] };
  };
  if (!data.playerstats?.success) return [];

  return (data.playerstats.achievements ?? []).map((a) => ({
    apiName: a.apiname,
    achieved: a.achieved === 1,
    unlockedAt: a.unlocktime > 0 ? new Date(a.unlocktime * 1000) : null,
  }));
}

export async function getSteamPlayerSummary(steamId: string): Promise<{ personaName: string; avatarUrl: string }> {
  const url = new URL("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002");
  url.searchParams.set("key", process.env.AUTH_STEAM_SECRET!);
  url.searchParams.set("steamids", steamId);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Steam API error: ${response.status}`);

  const data = (await response.json()) as {
    response?: { players?: { personaname: string; avatarfull: string }[] };
  };
  const player = data.response?.players?.[0];
  if (!player) throw new Error("Steam profile not found");

  return { personaName: player.personaname, avatarUrl: player.avatarfull };
}
