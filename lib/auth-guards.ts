import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireSignedIn() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  return session;
}

export async function requireAdminAccess() {
  const session = await requireSignedIn();
  const role = session.user.role;

  if (role !== "ADMIN" && role !== "REVIEWER" && role !== "SUPPORT") {
    redirect("/dashboard");
  }

  return session;
}

export async function requireChurchAccess(churchSlug: string) {
  const session = await requireSignedIn();
  const churchSlugs = session.user.churchSlugs ?? [];

  if (!churchSlugs.includes(churchSlug) && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return session;
}
