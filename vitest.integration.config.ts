import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    setupFiles: ["tests/integration/env.ts"],
    // One database, one connection: run files one after another.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000
  },
  resolve: {
    alias: {
      "@cccd/shared": fileURLToPath(new URL("./packages/shared/src/index.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./", import.meta.url))
    }
  }
});
