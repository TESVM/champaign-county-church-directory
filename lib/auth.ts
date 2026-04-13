import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { mockCredentials } from "@/lib/data/access";
import type { DirectoryRole } from "@/lib/types";
import { prisma } from "@/lib/prisma/client";

export const { auth, handlers, signIn, signOut } = NextAuth({
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

        if (email === process.env.ADMIN_EMAIL && password === "admin") {
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

        if (process.env.DATABASE_URL && password === "church") {
          const dbUser = await prisma.user.findUnique({
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
