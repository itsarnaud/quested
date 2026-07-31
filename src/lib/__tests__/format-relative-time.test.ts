import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "@/lib/format-relative-time";

describe("formatRelativeTime", () => {
  it("clamps anything under a minute to '1 minute ago'", () => {
    const now = new Date();
    const secondsAgo = new Date(now.getTime() - 10_000);
    expect(formatRelativeTime(secondsAgo, "en")).toBe("1 minute ago");
  });

  it("formats minutes", () => {
    const date = new Date(Date.now() - 5 * 60_000);
    expect(formatRelativeTime(date, "en")).toBe("5 minutes ago");
  });

  it("formats hours", () => {
    const date = new Date(Date.now() - 3 * 3_600_000);
    expect(formatRelativeTime(date, "en")).toBe("3 hours ago");
  });

  it("formats days", () => {
    const date = new Date(Date.now() - 2 * 86_400_000);
    expect(formatRelativeTime(date, "en")).toBe("2 days ago");
  });

  it("formats French", () => {
    const date = new Date(Date.now() - 2 * 3_600_000);
    expect(formatRelativeTime(date, "fr")).toBe("il y a 2 heures");
  });
});
