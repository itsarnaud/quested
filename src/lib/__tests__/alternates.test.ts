import { describe, expect, it } from "vitest";
import { pageAlternates } from "@/lib/alternates";
import { siteUrl } from "@/lib/site";

describe("pageAlternates", () => {
  it("uses the unprefixed URL for the default locale", () => {
    const { canonical } = pageAlternates("fr", "/games/silksong");
    expect(canonical).toBe(`${siteUrl}/games/silksong`);
  });

  it("prefixes non-default locales", () => {
    const { canonical } = pageAlternates("en", "/games/silksong");
    expect(canonical).toBe(`${siteUrl}/en/games/silksong`);
  });

  it("lists every locale in the alternates map", () => {
    const { languages } = pageAlternates("fr", "/search");
    expect(languages).toEqual({
      fr: `${siteUrl}/search`,
      en: `${siteUrl}/en/search`,
    });
  });
});
