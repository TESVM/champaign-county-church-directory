import type { Actor, UserActor } from "@/lib/actor";
import { db } from "@/lib/db";
import { actorFromSessionToken, createSession } from "@/lib/services/auth";

/** Empties every table between tests. Test data never leaves this in-memory database. */
export async function resetDatabase() {
  const prisma = await db();
  const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  );
  if (tables.length) {
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  }
}

let counter = 0;

/** A test church in a test city. Marked with a .test domain so it is obviously not real. */
export async function makeChurch(overrides: Partial<{ name: string; slug: string; citySlug: string; cityName: string; websiteUrl: string | null; phone: string | null; status: "ACTIVE" | "CLOSED" | "HIDDEN" }> = {}) {
  const prisma = await db();
  counter += 1;
  const citySlug = overrides.citySlug ?? "testville";
  const city = await prisma.city.upsert({
    where: { slug: citySlug },
    create: { slug: citySlug, name: overrides.cityName ?? "Testville", county: "Champaign", state: "IL" },
    update: {}
  });
  return prisma.church.create({
    data: {
      name: overrides.name ?? `Test Fellowship ${counter}`,
      slug: overrides.slug ?? `test-fellowship-${counter}`,
      cityId: city.id,
      city: city.name,
      state: "IL",
      address1: `${100 + counter} Test Street`,
      zip: "61820",
      phone: overrides.phone === undefined ? "(217) 555-0100" : overrides.phone,
      websiteUrl: overrides.websiteUrl === undefined ? `https://church${counter}.test/` : overrides.websiteUrl,
      status: overrides.status ?? "ACTIVE",
      lastUpdatedAt: new Date("2026-01-01T00:00:00Z")
    }
  });
}

export async function makeUser(email: string, role: "ADMIN" | "REVIEWER" | "SUPPORT" | "EDITOR" = "EDITOR") {
  const prisma = await db();
  return prisma.user.upsert({ where: { email }, create: { email, role, name: email.split("@")[0] }, update: { role } });
}

export async function addMember(churchId: string, userId: string, role: "CHURCH_OWNER" | "CHURCH_EDITOR") {
  const prisma = await db();
  return prisma.churchMembership.create({ data: { churchId, userId, role, status: "ACTIVE", grantedAt: new Date() } });
}

/** Resolves an actor exactly as a signed-in request would: through a real session. */
export async function actorFor(email: string, role: "ADMIN" | "REVIEWER" | "SUPPORT" | "EDITOR" = "EDITOR"): Promise<UserActor> {
  const user = await makeUser(email, role);
  const { token } = await createSession(user.id);
  const actor = await actorFromSessionToken(token);
  if (actor.kind !== "user") throw new Error("expected a user actor");
  return actor;
}

export async function refreshActor(actor: UserActor): Promise<Actor> {
  const { token } = await createSession(actor.id);
  return actorFromSessionToken(token);
}

export const anonymous: Actor = { kind: "anonymous" };
