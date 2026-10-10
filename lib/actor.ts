import { ForbiddenError } from "@/lib/errors";

export type ChurchRole = "CHURCH_OWNER" | "CHURCH_EDITOR";
export type StaffRole = "ADMIN" | "REVIEWER" | "SUPPORT";

export type MembershipRef = {
  churchId: string;
  churchSlug: string;
  churchName: string;
  role: ChurchRole;
};

/**
 * Who is performing an action. Services take this explicitly instead of
 * reading cookies, so every permission rule is enforced in one place and can
 * be tested without a browser.
 */
export type Actor =
  | { kind: "anonymous" }
  | { kind: "system"; name: string }
  | {
      kind: "user";
      id: string;
      email: string;
      name: string;
      /** Site-wide role. Church owners/editors have per-church memberships instead. */
      staffRole: StaffRole | null;
      memberships: MembershipRef[];
    };

export type UserActor = Extract<Actor, { kind: "user" }>;

export const anonymous: Actor = { kind: "anonymous" };

export function actorLabel(actor: Actor) {
  if (actor.kind === "user") return actor.email;
  if (actor.kind === "system") return `system:${actor.name}`;
  return "anonymous";
}

export function isStaff(actor: Actor): actor is UserActor {
  return actor.kind === "user" && actor.staffRole !== null;
}

export function isAdmin(actor: Actor): actor is UserActor {
  return actor.kind === "user" && actor.staffRole === "ADMIN";
}

/** Admins and reviewers can approve claims, submissions, and listing changes. */
export function canReview(actor: Actor): actor is UserActor {
  return actor.kind === "user" && (actor.staffRole === "ADMIN" || actor.staffRole === "REVIEWER");
}

export function membershipFor(actor: Actor, churchId: string) {
  if (actor.kind !== "user") return null;
  return actor.memberships.find((m) => m.churchId === churchId) ?? null;
}

/** Owners, editors, admins and reviewers may edit a church's listing. */
export function canEditChurch(actor: Actor, churchId: string): actor is UserActor {
  return canReview(actor) || Boolean(membershipFor(actor, churchId));
}

/** Only owners and admins manage the team and billing. */
export function canManageChurch(actor: Actor, churchId: string): actor is UserActor {
  return isAdmin(actor) || membershipFor(actor, churchId)?.role === "CHURCH_OWNER";
}

export function assertCanEditChurch(actor: Actor, churchId: string): asserts actor is UserActor {
  if (!canEditChurch(actor, churchId)) {
    throw new ForbiddenError("You can only edit churches you manage.");
  }
}

export function assertCanManageChurch(actor: Actor, churchId: string): asserts actor is UserActor {
  if (!canManageChurch(actor, churchId)) {
    throw new ForbiddenError("Only the church's owner or a directory administrator can do that.");
  }
}

export function assertReviewer(actor: Actor): asserts actor is UserActor {
  if (!canReview(actor)) throw new ForbiddenError("Directory reviewer access is required.");
}

export function assertStaff(actor: Actor): asserts actor is UserActor {
  if (!isStaff(actor)) throw new ForbiddenError("Directory staff access is required.");
}

export function assertAdmin(actor: Actor): asserts actor is UserActor {
  if (!isAdmin(actor)) throw new ForbiddenError("Administrator access is required.");
}
