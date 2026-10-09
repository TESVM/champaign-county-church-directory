import { cache } from "react";
import { cookies, headers } from "next/headers";
import type { Actor } from "@/lib/actor";
import { env } from "@/lib/env";
import { actorFromSessionToken, SESSION_TTL_SECONDS } from "@/lib/services/auth";
import type { DirectoryRole } from "@/lib/types";

/**
 * Cookie layer over the database-backed sessions in lib/services/auth.ts.
 *
 * The cookie holds only a random token. Role and church access are looked up
 * from the database on each request, so revoking an editor or disabling a user
 * takes effect immediately.
 */

export const SESSION_COOKIE_NAME = "cccd_session";
export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_SECONDS;

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: DirectoryRole | "EDITOR";
  churchSlugs: string[];
};

export type AuthSession = { user: AuthUser };

export const getActor = cache(async (): Promise<Actor> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return { kind: "anonymous" };
  try {
    return await actorFromSessionToken(token);
  } catch {
    // A database outage must not be mistaken for a valid session.
    return { kind: "anonymous" };
  }
});

export async function auth(): Promise<AuthSession | null> {
  const actor = await getActor();
  if (actor.kind !== "user") return null;
  const role: AuthUser["role"] =
    actor.staffRole ?? (actor.memberships.some((m) => m.role === "CHURCH_OWNER") ? "CHURCH_OWNER" : actor.memberships.length ? "CHURCH_EDITOR" : "EDITOR");
  return {
    user: {
      id: actor.id,
      name: actor.name,
      email: actor.email,
      role,
      churchSlugs: actor.memberships.map((m) => m.churchSlug)
    }
  };
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.isProduction,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS
};

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
}

export async function readSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions, maxAge: 0 });
}

/** A per-client key for rate limiting. Hashed before storage. */
export async function clientKey() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown-client"
  );
}
