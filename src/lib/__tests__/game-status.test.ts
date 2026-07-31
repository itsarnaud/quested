import { describe, expect, it } from "vitest";
import { STATUS_SLUGS, statusFromSlug } from "@/lib/game-status";

describe("statusFromSlug", () => {
  it("resolves every known slug back to its status", () => {
    for (const [status, slug] of Object.entries(STATUS_SLUGS)) {
      expect(statusFromSlug(slug)).toBe(status);
    }
  });

  it("returns null for an unknown slug", () => {
    expect(statusFromSlug("not-a-real-status")).toBeNull();
  });
});
