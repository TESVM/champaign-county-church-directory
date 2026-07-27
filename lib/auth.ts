import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { authSecret, env } from "@/lib/env";
import type { DirectoryRole } from "@/lib/types";

export const SESSION_COOKIE_NAME = "cccd_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: DirectoryRole;
  churchSlugs: string[];
};

export type AuthSession = {
  user: AuthUser;
};

/** Roles that may appear in a session. Anything else is rejected on decode. */
const DIRECTORY_ROLES = [
  "ADMIN",
  "REVIEWER",
  "SUPPORT",
  "CHURCH_OWNER",
  "CHURCH_EDITOR"
] as const satisfies readonly DirectoryRole[];

function isDirectoryRole(value: unknown): value is DirectoryRole {
  return (
    typeof value === "string" &&
    (DIRECTORY_ROLES as readonly string[]).includes(value)
  );
}

/**
 * Compares two strings without leaking their contents through timing.
 *
 * `timingSafeEqual` throws on length mismatch, so hash both sides to a fixed
 * width first. That also stops the comparison from revealing the secret's
 * length.
 */
function constantTimeEquals(a: string, b: string) {
  const aDigest = createHmac("sha256", authSecret).update(a).digest();
  const bDigest = createHmac("sha256", authSecret).update(b).digest();
  return timingSafeEqual(aDigest, bDigest);
}

/** Wire format of the signed session payload. */
type SessionPayload = AuthUser & {
  /** Issued-at, seconds since epoch. */
  iat: number;
  /** Expiry, seconds since epoch. Enforced on every decode. */
  exp: number;
};

function signSessionPayload(payload: string) {
  return createHmac("sha256", authSecret).update(payload).digest("base64url");
}

function encodeSession(user: AuthUser) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const claims: SessionPayload = {
    ...user,
    iat: issuedAt,
    exp: issuedAt + SESSION_MAX_AGE_SECONDS
  };

  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = signSessionPayload(payload);
  return `${payload}.${signature}`;
}

function decodeSession(token?: string | null): AuthUser | null {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signSessionPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as Partial<SessionPayload>;

    if (
      !parsed ||
      typeof parsed.id !== "string" ||
      typeof parsed.email !== "string" ||
      !isDirectoryRole(parsed.role) ||
      !Array.isArray(parsed.churchSlugs)
    ) {
      return null;
    }

    // Reject expired tokens. A signature alone must not grant access forever:
    // without this, a token captured from a shared machine never stops working.
    if (typeof parsed.exp !== "number" || !Number.isFinite(parsed.exp)) {
      return null;
    }

    if (Math.floor(Date.now() / 1000) >= parsed.exp) {
      return null;
    }

    return {
      id: parsed.id,
      name: typeof parsed.name === "string" ? parsed.name : parsed.email,
      email: parsed.email,
      role: parsed.role,
      churchSlugs: parsed.churchSlugs.filter((slug): slug is string => typeof slug === "string")
    };
  } catch (error) {
    console.error("Failed to decode auth session.", error);
    return null;
  }
}

/**
 * Authenticates a directory administrator against the configured credentials.
 *
 * This is deliberately the *only* credential path. The previous implementation
 * also accepted a hardcoded account list and a shared literal password for every
 * church user, both of which were published in the repository and on the login
 * page. Church-staff sign-in is being rebuilt on email magic links, which needs
 * no stored password; until that ships there is intentionally no church login.
 */
export async function authenticateWithCredentials(emailInput: unknown, passwordInput: unknown) {
  try {
    const email = emailInput?.toString().trim().toLowerCase();
    const password = passwordInput?.toString();

    if (!email || !password) {
      return null;
    }

    const { adminEmail, adminPassword } = env;

    // In development these may be unset; production boot already requires them.
    if (!adminEmail || !adminPassword) {
      if (env.isProduction) {
        console.error("Admin credentials are not configured; refusing sign-in.");
      }
      return null;
    }

    // Evaluate both comparisons before branching so a wrong email and a wrong
    // password take the same time.
    const emailMatches = constantTimeEquals(email, adminEmail);
    const passwordMatches = constantTimeEquals(password, adminPassword);

    if (emailMatches && passwordMatches) {
      return {
        id: "admin-user",
        name: "Directory Admin",
        email: adminEmail,
        role: "ADMIN",
        churchSlugs: []
      } satisfies AuthUser;
    }

    return null;
  } catch (error) {
    // Never log the submitted credentials.
    console.error("Credential authentication failed.", error);
    return null;
  }
}

export function createSessionCookieValue(user: AuthUser) {
  return encodeSession(user);
}

export async function auth(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = decodeSession(token);

  if (!user) {
    return null;
  }

  return { user };
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export { SESSION_MAX_AGE_SECONDS };
