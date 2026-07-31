import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    // Integration tests hit the real local Postgres — run them one at a
    // time so seeding/cleanup in one file can't race another.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/generated/**", "src/**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // next-auth imports "next/server" without an extension, which
      // resolves fine under Next.js/Turbopack but not under Vitest's
      // stricter ESM resolution.
      "next/server": path.resolve(__dirname, "node_modules/next/server.js"),
    },
  },
});
