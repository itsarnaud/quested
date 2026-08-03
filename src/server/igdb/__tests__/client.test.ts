import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveIgdbIdsBySteamAppIds, toArtworkUrl, toCoverUrl } from "@/server/igdb/client";

// The IGDB client caches its app access token at module scope, so once one
// test triggers a token fetch, later tests in this file reuse it — mock by
// URL rather than call order so that caching doesn't make assertions flaky.
function mockFetchByUrl(externalGamesResponse: unknown) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      if (url.includes("oauth2/token")) {
        return { ok: true, json: async () => ({ access_token: "token", expires_in: 3600 }) } as Response;
      }
      return { ok: true, json: async () => externalGamesResponse, text: async () => "" } as Response;
    }),
  );
  return calls;
}

describe("resolveIgdbIdsBySteamAppIds", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps Steam appids to IGDB game ids, skipping unmatched uids", async () => {
    mockFetchByUrl([
      { uid: "1091500", game: { id: 1877 } },
      { uid: "275850", game: { id: 3225 } },
    ]);

    const map = await resolveIgdbIdsBySteamAppIds(["1091500", "275850", "999999"]);

    expect(map.get("1091500")).toBe(1877);
    expect(map.get("275850")).toBe(3225);
    expect(map.has("999999")).toBe(false);
  });

  it("batches requests in chunks of 50 appids", async () => {
    const appIds = Array.from({ length: 60 }, (_, i) => String(i));
    const calls = mockFetchByUrl([]);

    await resolveIgdbIdsBySteamAppIds(appIds);

    const externalGamesCalls = calls.filter((url) => url.includes("external_games"));
    expect(externalGamesCalls).toHaveLength(2);
  });

  it("returns an empty map for an empty input", async () => {
    mockFetchByUrl([]);
    const map = await resolveIgdbIdsBySteamAppIds([]);
    expect(map.size).toBe(0);
  });
});

describe("toCoverUrl", () => {
  it("upgrades the thumb size to cover_big", () => {
    expect(toCoverUrl({ url: "//images.igdb.com/igdb/image/upload/t_thumb/abc.jpg" })).toBe(
      "https://images.igdb.com/igdb/image/upload/t_cover_big/abc.jpg",
    );
  });

  it("returns null when there's no cover", () => {
    expect(toCoverUrl(undefined)).toBeNull();
  });
});

describe("toArtworkUrl", () => {
  it("uses the first artwork, upgraded to 1080p", () => {
    expect(
      toArtworkUrl([
        { url: "//images.igdb.com/igdb/image/upload/t_thumb/one.jpg" },
        { url: "//images.igdb.com/igdb/image/upload/t_thumb/two.jpg" },
      ]),
    ).toBe("https://images.igdb.com/igdb/image/upload/t_1080p/one.jpg");
  });

  it("returns null when there are no artworks", () => {
    expect(toArtworkUrl(undefined)).toBeNull();
    expect(toArtworkUrl([])).toBeNull();
  });
});
