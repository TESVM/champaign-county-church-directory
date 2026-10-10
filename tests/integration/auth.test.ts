import { beforeEach, describe, expect, it } from "vitest";
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
