import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
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

export const { auth, handlers, signIn, signOut } = NextAuth({
  secret: authSecret,
  trustHost: true,
  session: {
    strategy: "jwt"
  },
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().toLowerCase();
        const password = credentials?.password?.toString();

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
          };
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
          };
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
            };
          }
        }

        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.churchSlugs = user.churchSlugs ?? [];
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as DirectoryRole | undefined;
        session.user.churchSlugs = (token.churchSlugs as string[] | undefined) ?? [];
      }

      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
});
