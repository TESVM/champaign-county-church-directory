import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as churchesApi } from "@/app/api/v1/churches/route";
import { GET as churchApi } from "@/app/api/v1/churches/[slug]/route";
import { GET as healthRoute } from "@/app/api/health/route";
import { db } from "@/lib/db";
import { setComplimentary } from "@/lib/services/billing";
import { updateChurchProfile } from "@/lib/services/churches";
import { actorFor, makeChurch, resetDatabase } from "./helpers";
import { NextRequest } from "next/server";

describe("public API uses the same data and entitlement rules", () => {
  beforeEach(resetDatabase);

  it("returns saved edits, and withholds paid-only links until the church is entitled", async () => {
    const church = await makeChurch({ name: "Api Test Church" });
    const admin = await actorFor("admin@test.invalid", "ADMIN");
    await updateChurchProfile(admin, church.id, {
      name: "Api Test Church",
      citySlug: "testville",
      phone: "2175550123",
      livestreamUrl: "https://youtube.com/@api/live",
      facebookUrl: "https://facebook.com/api",
      services: JSON.stringify([{ serviceName: "Worship", dayOfWeek: "Sunday", startTime: "11:00 AM" }])
    });

    const detail = async () => (await (await churchApi(new NextRequest(`http://localhost/api/v1/churches/${church.slug}`), { params: Promise.resolve({ slug: church.slug }) })).json()).data;
    let data = await detail();
    expect(data.contact.phone).toBe("(217) 555-0123");
    expect(data.contact.livestreamUrl).toBeNull();
    expect(data.socialLinks).toEqual([]);
    expect(data.serviceTimes[0]).toMatchObject({ dayOfWeek: "SUNDAY", startTime: "11:00" });

    await setComplimentary(admin, church.id, { until: "2099-01-01", reason: "test" });
    data = await detail();
    expect(data.contact.livestreamUrl).toBe("https://youtube.com/@api/live");
    expect(data.socialLinks).toEqual([{ platform: "facebook", url: "https://facebook.com/api" }]);

    const list = await (await churchesApi(new NextRequest("http://localhost/api/v1/churches?q=Api%20Test"))).json();
    expect(list.data.map((c: { slug: string }) => c.slug)).toEqual([church.slug]);
  });

  it("edits survive a database reconnect (a server restart)", async () => {
    const church = await makeChurch();
    const admin = await actorFor("admin@test.invalid", "ADMIN");
    await updateChurchProfile(admin, church.id, { name: "Persisted Name", citySlug: "testville" });
    const prisma = await db();
    await prisma.$disconnect();
    const again = await db();
    expect((await again.church.findUniqueOrThrow({ where: { id: church.id } })).name).toBe("Persisted Name");
  });

  it("health check reports the database and configuration without secrets", async () => {
    await makeChurch();
    const res = await healthRoute();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.checks).toMatchObject({ database: "ok", activeChurches: 1, billing: "not configured", email: "log-only (not delivered)" });
    expect(JSON.stringify(body)).not.toContain("whsec_");
  });
});

describe("missing configuration and database failures", () => {
  it("a missing DATABASE_URL produces an honest, user-safe error instead of fallback data", async () => {
    const original = process.env.DATABASE_URL;
    vi.stubEnv("DATABASE_URL", "");
    try {
      const { db: freshDb } = await import("@/lib/db");
      const error = await freshDb().catch((e) => e);
      expect(error.name).toBe("DatabaseUnavailableError");
      expect(error.publicMessage).toMatch(/Nothing was saved/);
    } finally {
      vi.stubEnv("DATABASE_URL", original!);
    }
  });

  it("an unreachable database surfaces as a 500 from the API, not as stale records", async () => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@127.0.0.1:1/none?connect_timeout=2");
    const globalForPrisma = globalThis as unknown as { prisma?: unknown };
    const saved = globalForPrisma.prisma;
    globalForPrisma.prisma = undefined;
    try {
      const { GET } = await import("@/app/api/v1/churches/route");
      const res = await GET(new NextRequest("http://localhost/api/v1/churches"));
      expect(res.status).toBeGreaterThanOrEqual(500);
      const body = await res.json();
      expect(body.ok).toBe(false);
    } finally {
      globalForPrisma.prisma = saved;
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
