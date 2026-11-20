import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { RateLimitedError, ValidationError } from "@/lib/errors";
import { actorFromSessionToken, consumeSignInToken, createSession, endSession, requestSignInLink } from "@/lib/services/auth";
import { revokeTeamMember } from "@/lib/services/claims";
import { addMember, actorFor, makeChurch, makeUser, resetDatabase } from "./helpers";

async function lastLinkTokenFor(email: string) {
  const prisma = await db();
  const mail = await prisma.outboundEmail.findFirst({ where: { to: email }, orderBy: { createdAt: "desc" } });
  const token = mail?.body?.match(/token=([A-Za-z0-9_-]+)/)?.[1];
  return { mail, token };
}

describe("email sign-in and sessions", () => {
  beforeEach(resetDatabase);

  it("does not email unknown addresses, but answers the same way", async () => {
    const result = await requestSignInLink("stranger@test.invalid", "client-1");
    expect(result.email).toBe("stranger@test.invalid");
    const prisma = await db();
    expect(await prisma.outboundEmail.count()).toBe(0);
    expect(await prisma.loginToken.count()).toBe(0);
  });

  it("rejects malformed email addresses with a field error", async () => {
    await expect(requestSignInLink("not-an-email", "client-1")).rejects.toBeInstanceOf(ValidationError);
  });

  it("emails a single-use link to an approved church member, and the link signs them in once", async () => {
    const church = await makeChurch();
    const user = await makeUser("pastor@church.test");
    await addMember(church.id, user.id, "CHURCH_OWNER");

    await requestSignInLink("Pastor@Church.test", "client-1");
    const { mail, token } = await lastLinkTokenFor("pastor@church.test");
    expect(mail?.status).toBe("LOGGED");
    expect(token).toBeTruthy();

    const prisma = await db();
    // Only the hash is stored.
    expect(await prisma.loginToken.count({ where: { id: token! } })).toBe(0);

    const session = await consumeSignInToken(token!);
    expect(session?.token).toBeTruthy();
    const actor = await actorFromSessionToken(session!.token);
    expect(actor).toMatchObject({ kind: "user", email: "pastor@church.test", staffRole: null });
    expect(actor.kind === "user" && actor.memberships.map((m) => m.churchId)).toEqual([church.id]);

    // Second use fails.
    expect(await consumeSignInToken(token!)).toBeNull();
  });

  it("rejects expired links", async () => {
    const church = await makeChurch();
    const user = await makeUser("late@church.test");
    await addMember(church.id, user.id, "CHURCH_EDITOR");
    await requestSignInLink("late@church.test", "client-2");
    const { token } = await lastLinkTokenFor("late@church.test");
    const prisma = await db();
    await prisma.loginToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await consumeSignInToken(token!)).toBeNull();
  });

  it("creates the bootstrap administrator from ADMIN_EMAIL on first sign-in", async () => {
    await requestSignInLink("admin@test.invalid", "client-3");
    const { token } = await lastLinkTokenFor("admin@test.invalid");
    const session = await consumeSignInToken(token!);
    const actor = await actorFromSessionToken(session!.token);
    expect(actor).toMatchObject({ kind: "user", staffRole: "ADMIN" });
  });

  it("rate-limits repeated sign-in requests for one address", async () => {
    const church = await makeChurch();
    const user = await makeUser("busy@church.test");
    await addMember(church.id, user.id, "CHURCH_EDITOR");
    for (let i = 0; i < 5; i += 1) await requestSignInLink("busy@church.test", `client-${i}`);
    await expect(requestSignInLink("busy@church.test", "client-x")).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("logout deletes the session server-side, and expired sessions are rejected", async () => {
    const user = await makeUser("staff@test.invalid", "REVIEWER");
    const { token } = await createSession(user.id);
    expect((await actorFromSessionToken(token)).kind).toBe("user");
    await endSession(token);
    expect((await actorFromSessionToken(token)).kind).toBe("anonymous");

    const second = await createSession(user.id);
    const prisma = await db();
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await actorFromSessionToken(second.token)).kind).toBe("anonymous");
  });

  it("revoking a membership or disabling a user takes effect on the very next request", async () => {
    const church = await makeChurch();
    const owner = await actorFor("owner@church.test");
    const editorUser = await makeUser("editor@church.test");
    await addMember(church.id, owner.id, "CHURCH_OWNER");
    const membership = await addMember(church.id, editorUser.id, "CHURCH_EDITOR");
    const { token } = await createSession(editorUser.id);

    const before = await actorFromSessionToken(token);
    expect(before.kind === "user" && before.memberships.length).toBe(1);

    const ownerActor = await actorFromSessionToken((await createSession(owner.id)).token);
    await revokeTeamMember(ownerActor, membership.id);
    const after = await actorFromSessionToken(token);
    expect(after.kind === "user" && after.memberships.length).toBe(0);

    const prisma = await db();
    await prisma.user.update({ where: { id: editorUser.id }, data: { disabledAt: new Date() } });
    expect((await actorFromSessionToken(token)).kind).toBe("anonymous");
  });

  it("ignores forged or oversized cookies", async () => {
    expect((await actorFromSessionToken("forged-token")).kind).toBe("anonymous");
    expect((await actorFromSessionToken("x".repeat(500))).kind).toBe("anonymous");
  });
});


describe("administrator password sign-in", () => {
  const password = "integration-only-admin-password";
  let passwordAuth: typeof import("@/lib/services/auth");

  async function loadPasswordAuth(flag: "on" | "off" | undefined) {
    vi.stubEnv("ADMIN_PASSWORD", password);
    vi.stubEnv("ADMIN_PASSWORD_LOGIN", flag);
    vi.resetModules();
    passwordAuth = await import("@/lib/services/auth");
  }

  beforeEach(async () => {
    await resetDatabase();
    // Keep attempts inside one fixed window, even if the suite starts near its boundary.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-19T18:05:00Z"));
    await loadPasswordAuth("on");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("refuses the sixth normalized account attempt even from a different client", async () => {
    for (let i = 0; i < 5; i += 1) {
      const email = i % 2 ? " ADMIN@TEST.INVALID " : "admin@test.invalid";
      expect(await passwordAuth.passwordSignIn(email, "wrong-password", `client-${i}`)).toBeNull();
    }
    expect(await passwordAuth.passwordSignIn("admin@test.invalid", password, "new-client")).toBeNull();
    const prisma = await db();
    expect(await prisma.session.count()).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: "auth.password_failed" } })).toBe(6);
    const blocked = await prisma.auditLog.findFirst({ where: { details: { path: ["reason"], equals: "rate_limited" } } });
    expect(blocked).not.toBeNull();
  });

  it("preserves the IP limit when an attacker changes submitted accounts", async () => {
    for (let i = 0; i < 10; i += 1) {
      expect(await passwordAuth.passwordSignIn(`unknown-${i}@test.invalid`, "wrong-password", "one-client")).toBeNull();
    }
    expect(await passwordAuth.passwordSignIn("admin@test.invalid", password, "one-client")).toBeNull();
    const prisma = await db();
    expect(await prisma.session.count()).toBe(0);
  });

  it("audits failed and successful attempts without passwords, failed email, or raw IP", async () => {
    const rawIp = "192.0.2.42";
    const unknownEmail = "private-submission@test.invalid";
    expect(await passwordAuth.passwordSignIn(unknownEmail, "submitted-wrong-password", rawIp)).toBeNull();
    const session = await passwordAuth.passwordSignIn("ADMIN@TEST.INVALID", password, rawIp);
    expect(session?.token).toBeTruthy();
    expect(await passwordAuth.actorFromSessionToken(session!.token)).toMatchObject({ kind: "user", staffRole: "ADMIN" });

    const prisma = await db();
    const failure = await prisma.auditLog.findFirstOrThrow({ where: { action: "auth.password_failed" } });
    const success = await prisma.auditLog.findFirstOrThrow({ where: { action: "auth.password_signed_in" } });
    const { keyedHash } = await import("@/lib/security");
    const { authSecret } = await import("@/lib/env");
    expect(failure).toMatchObject({ actorId: null, actorEmail: "anonymous", details: { clientKeyHash: keyedHash(rawIp, authSecret), reason: "invalid_credentials" } });
    expect(success).toMatchObject({ actorEmail: "admin@test.invalid", entityType: "User" });
    expect(success.actorId).toBeTruthy();
    expect(success.entityId).toBe(success.actorId);
    const serialized = JSON.stringify([failure, success]);
    for (const sensitive of [password, "submitted-wrong-password", rawIp, unknownEmail, session!.token]) {
      expect(serialized).not.toContain(sensitive);
    }
    const rateRows = JSON.stringify(await prisma.rateLimit.findMany());
    expect(rateRows).not.toContain(rawIp);
    expect(rateRows).not.toContain(unknownEmail);
  });

  it("refuses a correct password with the flag off without comparing credentials", async () => {
    await loadPasswordAuth("off");
    const security = await import("@/lib/security");
    const compare = vi.spyOn(security, "constantTimeEquals");
    expect(await passwordAuth.passwordSignIn("admin@test.invalid", password, "client-off")).toBeNull();
    expect(compare).not.toHaveBeenCalled();
    const prisma = await db();
    expect(await prisma.session.count()).toBe(0);
    expect(await prisma.auditLog.findFirst({ where: { action: "auth.password_failed" } })).toMatchObject({ details: { reason: "disabled" } });
  });

  it("returns the same failure result for missing and incorrect credentials", async () => {
    expect(await passwordAuth.passwordSignIn(undefined, undefined, "missing-client")).toBeNull();
    expect(await passwordAuth.passwordSignIn("admin@test.invalid", "wrong-password", "wrong-client")).toBeNull();
    const prisma = await db();
    expect(await prisma.session.count()).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: "auth.password_failed" } })).toBe(2);
  });

  it("defaults password login to on when the new flag is absent", async () => {
    await loadPasswordAuth(undefined);
    const { env } = await import("@/lib/env");
    expect(env.adminPasswordLogin).toBe("on");
    expect((await passwordAuth.passwordSignIn("admin@test.invalid", password, "default-client"))?.token).toBeTruthy();
  });

  it("rejects an invalid password-login flag during environment validation", async () => {
    vi.stubEnv("ADMIN_PASSWORD_LOGIN", "invalid");
    vi.resetModules();
    await expect(import("@/lib/env")).rejects.toThrow(/ADMIN_PASSWORD_LOGIN/);
  });

  it("allows another attempt after the fixed account window resets", async () => {
    for (let i = 0; i < 5; i += 1) {
      expect(await passwordAuth.passwordSignIn("admin@test.invalid", "wrong-password", `window-client-${i}`)).toBeNull();
    }
    expect(await passwordAuth.passwordSignIn("admin@test.invalid", password, "window-client-new")).toBeNull();
    vi.setSystemTime(new Date("2026-11-19T18:20:00Z"));
    expect((await passwordAuth.passwordSignIn("admin@test.invalid", password, "window-client-new"))?.token).toBeTruthy();
  });

  it("keeps email-link sign-in working when password login is off", async () => {
    await loadPasswordAuth("off");
    await passwordAuth.requestSignInLink("admin@test.invalid", "email-client");
    const { token } = await lastLinkTokenFor("admin@test.invalid");
    expect(token).toBeTruthy();
    const session = await passwordAuth.consumeSignInToken(token!);
    expect(session?.token).toBeTruthy();
    expect(await passwordAuth.actorFromSessionToken(session!.token)).toMatchObject({ kind: "user", staffRole: "ADMIN" });
  });

  it("does not authenticate if recording a failed attempt is unavailable", async () => {
    const auditModule = await import("@/lib/services/audit");
    vi.spyOn(auditModule, "audit").mockRejectedValueOnce(new Error("Audit unavailable"));
    await expect(passwordAuth.passwordSignIn("admin@test.invalid", "wrong-password", "audit-client")).rejects.toThrow("Audit unavailable");
    expect(await (await db()).session.count()).toBe(0);
  });
});
