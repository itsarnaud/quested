import { vi } from "vitest";

// Rate limiting depends on real Upstash Redis. Mocking it here (rather than
// touching the production withRateLimit code) keeps tests fast, removes the
// need for a Redis secret in CI, and avoids ever tripping a real quota.
vi.mock("@/lib/redis", () => ({
  redis: {},
  searchRatelimit: { limit: async () => ({ success: true }) },
  standardRatelimit: { limit: async () => ({ success: true }) },
  steamSyncRatelimit: { limit: async () => ({ success: true }) },
  psnSyncRatelimit: { limit: async () => ({ success: true }) },
}));
