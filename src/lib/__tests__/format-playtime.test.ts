import { describe, expect, it } from "vitest";
import { formatPlaytime } from "@/lib/format-playtime";

describe("formatPlaytime", () => {
  it("shows minutes under an hour", () => {
    expect(formatPlaytime(45)).toBe("45 min");
  });

  it("rounds to the nearest hour once past an hour", () => {
    expect(formatPlaytime(90)).toBe("2 h");
    expect(formatPlaytime(125)).toBe("2 h");
  });

  it("handles large totals", () => {
    expect(formatPlaytime(51_814)).toBe("864 h");
  });

  it("handles zero", () => {
    expect(formatPlaytime(0)).toBe("0 min");
  });
});
