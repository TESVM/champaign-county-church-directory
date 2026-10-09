import { z } from "zod";
import type { Actor, MembershipRef, StaffRole, UserActor } from "@/lib/actor";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { log } from "@/lib/log";
import { constantTimeEquals, normalizeEmail, randomToken, sha256 } from "@/lib/security";
import { audit } from "@/lib/services/audit";
import { sendEmail } from "@/lib/services/email";
import { rateLimit } from "@/lib/services/rate-limit";
import { siteUrl } from "@/lib/site";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const LOGIN_TOKEN_TTL_SECONDS = 60 * 15;
const STAFF_ROLES: StaffRole[] = ["ADMIN", "REVIEWER", "SUPPORT"];

const emailSchema = z.string().trim().toLowerCase().email().max(254);

function isBootstrapAdmin(email: string) {
  return Boolean(env.adminEmail && constantTimeEquals(email, env.adminEmail));
}

/** True when this email may sign in: staff, an active church member, or the bootstrap admin. */
async function isEligible(email: string) {
  if (isBootstrapAdmin(email)) return true;
  const prisma = await db();
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      role: true,
      disabledAt: true,
      memberships: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 }
    }
  });
  if (!user || user.disabledAt) return false;
  return STAFF_ROLES.includes(user.role as StaffRole) || user.memberships.length > 0;
}

/**
 * Emails a single-use sign-in link when the address belongs to an account.
 *
 * Returns the same result for unknown addresses so the form cannot be used to
 * discover who manages which church. Throws when an eligible address could not
 * be emailed, so the page never claims a link was sent when it was not.
 */
export async function requestSignInLink(rawEmail: unknown, clientKey: string, nextPath = "/dashboard") {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) {
    throw new ValidationError("Enter a valid email address.", { email: "Enter a valid email address." });
  }
  const email = parsed.data;

  await rateLimit("signin-ip", clientKey, 20, 60 * 60);
  await rateLimit("signin-email", email, 5, 60 * 60);

  if (!(await isEligible(email))) {
    log.info("auth.link_not_sent", { reason: "no_account" });
    return { email };
  }

  const prisma = await db();
  const token = randomToken();
  await prisma.loginToken.create({
    data: {
      id: sha256(token),
      email,
      expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_SECONDS * 1000)
    }
  });

  const link = new URL("/auth/verify", siteUrl());
  link.searchParams.set("token", token);
  if (nextPath.startsWith("/") && !nextPath.startsWith("//")) link.searchParams.set("next", nextPath);

  await sendEmail({
    to: email,
    subject: "Your sign-in link for the Champaign County Church Directory",
    sensitive: true,
    text: [
      "Use this link to sign in to the Champaign County Church Directory:",
      "",
      link.toString(),
      "",
      `It works once and expires in ${LOGIN_TOKEN_TTL_SECONDS / 60} minutes.`,
      "If you did not ask to sign in, you can ignore this email."
    ].join("\n")
  });

  return { email };
}

/** Exchanges a sign-in token for a new session token. Returns null if invalid, used, or expired. */
export async function consumeSignInToken(token: string) {
  if (!token || token.length > 200) return null;
  const prisma = await db();
  const id = sha256(token);

  // Mark used atomically so two clicks (or a mail scanner) cannot both succeed.
  const claimed = await prisma.loginToken.updateMany({
    where: { id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() }
  });
  if (claimed.count !== 1) return null;

  const record = await prisma.loginToken.findUnique({ where: { id } });
  if (!record) return null;

  if (!(await isEligible(record.email))) return null;

  const user = await prisma.user.upsert({
    where: { email: record.email },
    create: {
      email: record.email,
      name: isBootstrapAdmin(record.email) ? "Directory Admin" : null,
      role: isBootstrapAdmin(record.email) ? "ADMIN" : "EDITOR"
    },
    update: isBootstrapAdmin(record.email) ? { role: "ADMIN", disabledAt: null } : {}
  });

  return createSession(user.id);
}

/** Bootstrap administrator password sign-in (optional; email links are preferred). */
export async function passwordSignIn(rawEmail: unknown, rawPassword: unknown, clientKey: string) {
  const email = typeof rawEmail === "string" ? normalizeEmail(rawEmail) : "";
  const password = typeof rawPassword === "string" ? rawPassword : "";

  await rateLimit("password-ip", clientKey, 10, 60 * 15);
  if (!email || !password || !env.adminEmail || !env.adminPassword) return null;

  const emailOk = constantTimeEquals(email, env.adminEmail);
  const passwordOk = constantTimeEquals(password, env.adminPassword);
  if (!emailOk || !passwordOk) return null;

  const prisma = await db();
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: "Directory Admin", role: "ADMIN" },
    update: { role: "ADMIN", disabledAt: null }
  });
  return createSession(user.id);
}

export async function createSession(userId: string) {
  const prisma = await db();
  const token = randomToken();
  await prisma.session.create({
    data: {
      id: sha256(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000)
    }
  });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  return { token, expiresInSeconds: SESSION_TTL_SECONDS };
}

/**
 * Resolves a session cookie to an actor. Memberships are read on every request,
 * so revoking access takes effect immediately rather than when a cookie expires.
 */
export async function actorFromSessionToken(token: string | undefined | null): Promise<Actor> {
  if (!token || token.length > 200) return { kind: "anonymous" };
  const prisma = await db();
  const session = await prisma.session.findUnique({
    where: { id: sha256(token) },
    include: {
      user: {
        include: {
          memberships: {
            where: { status: "ACTIVE" },
            include: { church: { select: { id: true, slug: true, name: true } } }
          }
        }
      }
    }
  });

  if (!session || session.expiresAt <= new Date() || session.user.disabledAt) {
    return { kind: "anonymous" };
  }

  if (Date.now() - session.lastSeenAt.getTime() > 10 * 60 * 1000) {
    await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }

  const user = session.user;
  const staffRole = STAFF_ROLES.includes(user.role as StaffRole) ? (user.role as StaffRole) : null;
  const memberships: MembershipRef[] = user.memberships
    .filter((m) => m.role === "CHURCH_OWNER" || m.role === "CHURCH_EDITOR")
    .map((m) => ({
      churchId: m.church.id,
      churchSlug: m.church.slug,
      churchName: m.church.name,
      role: m.role as MembershipRef["role"]
    }));

  return {
    kind: "user",
    id: user.id,
    email: user.email,
    name: user.name ?? user.email,
    staffRole,
    memberships
  } satisfies UserActor;
}

export async function endSession(token: string | undefined | null) {
  if (!token) return;
  const prisma = await db();
  await prisma.session.deleteMany({ where: { id: sha256(token) } });
}

export async function endAllSessionsForUser(actor: Actor, userId: string) {
  const prisma = await db();
  const result = await prisma.session.deleteMany({ where: { userId } });
  await audit(actor, {
    action: "user.sessions_revoked",
    entityType: "User",
    entityId: userId,
    summary: `Signed out ${result.count} active session(s)`
  });
  return result.count;
}

export async function pruneExpiredAuthRecords() {
  const prisma = await db();
  const now = new Date();
  await prisma.session.deleteMany({ where: { expiresAt: { lt: now } } });
  await prisma.loginToken.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 24 * 3600 * 1000) } } });
}
