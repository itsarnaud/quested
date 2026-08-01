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
