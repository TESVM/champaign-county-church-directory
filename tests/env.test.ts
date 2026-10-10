import { afterEach, describe, expect, it, vi } from "vitest";

async function loadEnv(vars: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, value);
  return import("@/lib/env");
}

afterEach(() => vi.unstubAllEnvs());

describe("environment validation", () => {
  it("rejects malformed values at runtime", async () => {
    await expect(loadEnv({ AUTH_SECRET: "short", NEXT_PHASE: undefined })).rejects.toThrow(/AUTH_SECRET/);
  });

  it("does not fail a build over a malformed runtime secret", async () => {
    const env = await loadEnv({ AUTH_SECRET: "short", CRON_SECRET: "x", NEXT_PHASE: "phase-production-build" });
    expect(env.env.cronSecret).toBeUndefined();
  });
});
