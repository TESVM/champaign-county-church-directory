import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { mockCredentials } from "@/lib/data/access";
import type { DirectoryRole } from "@/lib/types";

const authSecret =
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  (process.env.NODE_ENV === "production"
    ? "champaign-county-church-directory-production-fallback-secret"
    : "champaign-county-church-directory-dev-secret");

const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@countychurchdirectory.local").toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD ?? "admin";

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

function signSessionPayload(payload: string) {
  return createHmac("sha256", authSecret).update(payload).digest("base64url");
}

function encodeSession(user: AuthUser) {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
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
    const parsed = JSON.parse(decoded) as Partial<AuthUser>;

    if (
      !parsed ||
      typeof parsed.id !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.role !== "string" ||
      !Array.isArray(parsed.churchSlugs)
    ) {
      return null;
    }

    return {
      id: parsed.id,
      name: typeof parsed.name === "string" ? parsed.name : parsed.email,
      email: parsed.email,
      role: parsed.role as DirectoryRole,
      churchSlugs: parsed.churchSlugs.filter((slug): slug is string => typeof slug === "string")
    };
  } catch (error) {
    console.error("Failed to decode auth session.", error);
    return null;
  }
}

async function findDbChurchUser(email: string) {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  try {
    const { prisma } = await import("@/lib/prisma/client");
    return await prisma.user.findUnique({
      where: {
        email
      },
      include: {
        memberships: {
          where: {
            status: "ACTIVE"
          },
          include: {
            church: {
              select: {
                slug: true
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error("Database-backed auth lookup failed.", error);
    return null;
  }
}

export async function authenticateWithCredentials(emailInput: unknown, passwordInput: unknown) {
  try {
    const email = emailInput?.toString().toLowerCase();
    const password = passwordInput?.toString();

    if (!email || !password) {
      return null;
    }

    if (email === adminEmail && password === adminPassword) {
      return {
        id: "admin-user",
        name: "Directory Admin",
        email,
        role: "ADMIN",
        churchSlugs: []
      } satisfies AuthUser;
    }

    const matched = mockCredentials.find(
      (account) => account.email.toLowerCase() === email && account.password === password
    );

    if (matched) {
      return {
        id: matched.email,
        name: matched.email,
        email: matched.email,
        role: matched.role,
        churchSlugs: matched.churchSlugs
      } satisfies AuthUser;
    }

    if (password === "church") {
      const dbUser = await findDbChurchUser(email);

      if (dbUser && (dbUser.role === "CHURCH_OWNER" || dbUser.role === "CHURCH_EDITOR")) {
        return {
          id: dbUser.id,
          name: dbUser.name ?? dbUser.email,
          email: dbUser.email,
          role: dbUser.role,
          churchSlugs: dbUser.memberships.map((membership) => membership.church.slug)
        } satisfies AuthUser;
      }
    }

    return null;
  } catch (error) {
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
