import { DefaultSession } from "next-auth";
import { DirectoryRole } from "@/lib/types";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      role?: DirectoryRole;
      churchSlugs?: string[];
    };
  }

  interface User {
    role?: DirectoryRole;
    churchSlugs?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: DirectoryRole;
    churchSlugs?: string[];
  }
}
