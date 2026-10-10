import { redirect } from "next/navigation";
import { type UserActor, canEditChurch, canReview, isStaff } from "@/lib/actor";
import { getActor } from "@/lib/auth";

export async function requireUser(nextPath = "/dashboard"): Promise<UserActor> {
  const actor = await getActor();
  if (actor.kind !== "user") redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return actor;
}

export async function requireStaff(nextPath = "/admin"): Promise<UserActor> {
  const actor = await requireUser(nextPath);
  if (!isStaff(actor)) redirect("/dashboard?denied=1");
  return actor;
}

export async function requireReviewer(nextPath = "/admin"): Promise<UserActor> {
  const actor = await requireUser(nextPath);
  if (!canReview(actor)) redirect("/admin?denied=1");
  return actor;
}

export async function requireChurchEditor(churchId: string, nextPath: string): Promise<UserActor> {
  const actor = await requireUser(nextPath);
  if (!canEditChurch(actor, churchId)) redirect("/dashboard?denied=1");
  return actor;
}
