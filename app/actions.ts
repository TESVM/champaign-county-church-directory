"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type Actor, assertAdmin } from "@/lib/actor";
import { clearSessionCookie, clientKey, getActor, readSessionToken, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppError, ValidationError, publicMessageFor } from "@/lib/errors";
import type { FormState } from "@/lib/forms/state";
import { log } from "@/lib/log";
import { safeReturnPath } from "@/lib/safe-redirect";
import { decideSuggestedChange, runWebsiteReview } from "@/lib/scan/website-review";
import { endAllSessionsForUser, endSession, passwordSignIn, requestSignInLink } from "@/lib/services/auth";
import { openBillingPortal, setComplimentary, startCheckout } from "@/lib/services/billing";
import { createPublicSourceOrganization, reviewCampusEvent, reviewOrganization, submitCampusEvent, submitOrganization } from "@/lib/services/campus";
import { markPublicSourceChecked, setChurchStatus, setFeatured, setStudentTags, updateChurchProfile } from "@/lib/services/churches";
import { geocodeMissingChurches } from "@/lib/services/geocode";
import { inviteTeamMember, reviewClaim, revokeTeamMember, setStaffRole, setUserDisabled, submitClaim } from "@/lib/services/claims";
import { cancelEvent, moderateResource, removeResource, saveEvent, saveResource, saveVisitorGuide } from "@/lib/services/engagement";
import {
  resolveContactMessage,
  resolveCorrection,
  reviewSubmission,
  submitContactMessage,
  submitCorrection,
  submitNewChurch
} from "@/lib/services/inbox";
import { removeChurchPhoto, removePastorPhoto, saveChurchPhoto, savePastorPhoto } from "@/lib/services/media";

/**
 * Server actions. Each resolves the signed-in actor from the session cookie
 * and delegates to a service that enforces permissions itself.
 *
 * A success state is returned only after the service call completed, so the
 * page never claims something was saved when it was not.
 */

const ok = (message: string): FormState => ({ status: "success", message, nonce: Date.now() });

function isNextControlFlow(error: unknown) {
  return Boolean(error && typeof error === "object" && "digest" in error && String((error as { digest: unknown }).digest).startsWith("NEXT_"));
}

async function run(label: string, fn: () => Promise<string>): Promise<FormState> {
  try {
    return ok(await fn());
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    if (!(error instanceof AppError) || error.status >= 500) log.error(`action.${label}.failed`, { error });
    return {
      status: "error",
      message: publicMessageFor(error),
      fieldErrors: error instanceof ValidationError ? error.fieldErrors : undefined,
      nonce: Date.now()
    };
  }
}

function fields(formData: FormData) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION")) continue;
    out[key] = value;
  }
  return out;
}

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

/** Bots fill hidden fields; people cannot see this one. Treated as a failure, never as success. */
function assertHuman(formData: FormData) {
  if (str(formData, "company_website")) {
    throw new ValidationError("Your submission could not be sent. Please try again.");
  }
}

/** Queue decisions remove the item from the list, so confirm on the next page load instead. */
function doneRedirect(result: FormState, path: string, code: string): FormState {
  if (result.status === "success") redirect(`${path}?done=${code}`);
  return result;
}

async function signedIn(): Promise<Actor> {
  const actor = await getActor();
  if (actor.kind !== "user") redirect("/login");
  return actor;
}

function churchIdFromForm(formData: FormData) {
  const churchId = str(formData, "churchId");
  if (!churchId) throw new ValidationError("Missing church.");
  return churchId;
}

async function revalidateChurch(churchId: string) {
  const prisma = await db();
  const church = await prisma.church.findUnique({ where: { id: churchId }, select: { slug: true, cityRecord: { select: { slug: true } } } });
  if (!church) return;
  revalidatePath(`/churches/${church.slug}`);
  revalidatePath(`/dashboard/churches/${church.slug}`, "layout");
  revalidatePath(`/admin/churches/${church.slug}`);
  if (church.cityRecord) revalidatePath(`/cities/${church.cityRecord.slug}`);
  revalidatePath("/directory");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Public forms
// ---------------------------------------------------------------------------

export async function submitContactAction(_: FormState, formData: FormData) {
  return run("contact", async () => {
    assertHuman(formData);
    await submitContactMessage(fields(formData), await clientKey());
    return "Thank you. Your message was received and saved for the directory team. We reply by email, usually within a few business days.";
  });
}

export async function submitListingAction(_: FormState, formData: FormData) {
  return run("submit-listing", async () => {
    assertHuman(formData);
    await submitNewChurch(fields(formData), await clientKey());
    return "Thank you. The church was submitted for review. We will email you when it is published or if we have questions.";
  });
}

export async function submitClaimAction(_: FormState, formData: FormData) {
  return run("claim", async () => {
    assertHuman(formData);
    const result = await submitClaim(fields(formData), await clientKey());
    return result.updatedExisting
      ? `Your open request to manage ${result.churchName} was updated and is back in the review queue.`
      : `Your request to manage ${result.churchName} was received. A reviewer will verify it and email you the result.`;
  });
}

export async function submitCorrectionAction(_: FormState, formData: FormData) {
  return run("correction", async () => {
    assertHuman(formData);
    await submitCorrection(fields(formData), await clientKey());
    return "Thank you. Your report was saved and sent to the directory team for review.";
  });
}

// ---------------------------------------------------------------------------
// Sign-in
// ---------------------------------------------------------------------------

export async function requestSignInAction(_: FormState, formData: FormData) {
  return run("signin", async () => {
    const next = safeReturnPath(str(formData, "next"), "/dashboard");
    const { email } = await requestSignInLink(str(formData, "email"), await clientKey(), next);
    return `If ${email} belongs to a church manager or directory staff account, a sign-in link is on its way. It expires in 15 minutes. No account yet? Request to manage your church’s listing first.`;
  });
}

export async function passwordSignInAction(_: FormState, formData: FormData) {
  const result = await run("password-signin", async () => {
    const session = await passwordSignIn(str(formData, "email"), str(formData, "password"), await clientKey());
    if (!session) throw new ValidationError("That email and password did not match.");
    await setSessionCookie(session.token);
    return "Signed in.";
  });
  if (result.status === "success") redirect(safeReturnPath(str(formData, "next"), "/admin"));
  return result;
}

export async function verifySignInAction(formData: FormData) {
  const token = str(formData, "token") ?? "";
  const next = safeReturnPath(str(formData, "next"), "/dashboard");
  const session = await import("@/lib/services/auth").then((m) => m.consumeSignInToken(token)).catch((error) => {
    log.error("action.verify.failed", { error });
    return null;
  });
  if (!session) redirect("/login?error=link");
  await setSessionCookie(session.token);
  redirect(next);
}

export async function signOutAction() {
  const token = await readSessionToken();
  await endSession(token).catch(() => undefined);
  await clearSessionCookie();
  redirect("/");
}

// ---------------------------------------------------------------------------
// Church dashboard
// ---------------------------------------------------------------------------

export async function saveProfileAction(_: FormState, formData: FormData) {
  return run("profile", async () => {
    const actor = await signedIn();
    const churchId = churchIdFromForm(formData);
    const input = fields(formData);
    input.ministries = formData.getAll("ministries").map(String);
    const result = await updateChurchProfile(actor, churchId, input);
    await revalidateChurch(churchId);
    return result.changedFields.length
      ? "Saved. Your changes are live on the public listing."
      : "Saved. Nothing had changed; the listing is recorded as reviewed today.";
  });
}

export async function saveVisitorGuideAction(_: FormState, formData: FormData) {
  return run("visitor-guide", async () => {
    const actor = await signedIn();
    const churchId = churchIdFromForm(formData);
    const input = fields(formData);
    input.languages = formData.getAll("languages").map(String);
    await saveVisitorGuide(actor, churchId, input);
    await revalidateChurch(churchId);
    return "Saved. “Plan your first visit” is updated on your public listing.";
  });
}

export async function saveChurchPhotoAction(_: FormState, formData: FormData) {
  return run("photo", async () => {
    const actor = await signedIn();
    const churchId = churchIdFromForm(formData);
    const file = formData.get("file");
    await saveChurchPhoto(actor, churchId, {
      file: file instanceof File ? file : null,
      imageUrl: str(formData, "imageUrl"),
      sourceUrl: str(formData, "sourceUrl"),
      credit: str(formData, "credit"),
      permission: str(formData, "permission")
    });
    await revalidateChurch(churchId);
    return "Photo saved and shown on the public listing.";
  });
}

export async function removeChurchPhotoAction(_: FormState, formData: FormData) {
  return run("photo-remove", async () => {
    const actor = await signedIn();
    const churchId = churchIdFromForm(formData);
    await removeChurchPhoto(actor, churchId);
    await revalidateChurch(churchId);
    return "Photo removed. The listing now shows a neutral placeholder.";
  });
}

export async function savePastorPhotoAction(_: FormState, formData: FormData) {
  return run("pastor-photo", async () => {
    const actor = await signedIn();
    const churchId = churchIdFromForm(formData);
    const file = formData.get("pastorFile");
    await savePastorPhoto(actor, churchId, {
      file: file instanceof File ? file : null,
      imageUrl: str(formData, "pastorImageUrl"),
      credit: str(formData, "pastorCredit"),
      permission: str(formData, "pastorPermission")
    });
    await revalidateChurch(churchId);
    return "Pastor photo saved and shown on the public listing.";
  });
}

export async function removePastorPhotoAction(_: FormState, formData: FormData) {
  return run("pastor-photo-remove", async () => {
    const actor = await signedIn();
    const churchId = churchIdFromForm(formData);
    await removePastorPhoto(actor, churchId);
    await revalidateChurch(churchId);
    return "Pastor photo removed.";
  });
}

export async function saveEventAction(_: FormState, formData: FormData) {
  return run("event", async () => {
    const actor = await signedIn();
    const churchId = churchIdFromForm(formData);
    await saveEvent(actor, churchId, fieldsWithLists(formData, ["categories"]), str(formData, "eventId") || undefined);
    await revalidateChurch(churchId);
    revalidatePath("/events");
    return "Event saved and listed on the county calendar.";
  });
}

export async function cancelEventAction(_: FormState, formData: FormData) {
  return run("event-cancel", async () => {
    const actor = await signedIn();
    await cancelEvent(actor, str(formData, "eventId") ?? "");
    revalidatePath("/events");
    revalidatePath("/dashboard", "layout");
    return "Event cancelled and removed from the calendar.";
  });
}

export async function saveResourceAction(_: FormState, formData: FormData) {
  return run("resource", async () => {
    const actor = await signedIn();
    const churchId = churchIdFromForm(formData);
    const { status } = await saveResource(actor, churchId, fields(formData), str(formData, "resourceId") || undefined);
    revalidatePath("/resources");
    await revalidateChurch(churchId);
    return status === "APPROVED"
      ? "Saved and published."
      : "Saved. A directory reviewer will check it before it appears publicly, usually within a few business days.";
  });
}

export async function removeResourceAction(_: FormState, formData: FormData) {
  return run("resource-remove", async () => {
    const actor = await signedIn();
    await removeResource(actor, str(formData, "resourceId") ?? "");
    revalidatePath("/resources");
    revalidatePath("/dashboard", "layout");
    return "Removed.";
  });
}

export async function inviteMemberAction(_: FormState, formData: FormData) {
  return run("invite", async () => {
    const actor = await signedIn();
    const churchId = churchIdFromForm(formData);
    const result = await inviteTeamMember(actor, churchId, fields(formData));
    revalidatePath("/dashboard", "layout");
    return result.emailed
      ? `${result.email} was added and emailed instructions to sign in.`
      : `${result.email} was added, but the notification email could not be sent. Ask them to sign in on the directory’s sign-in page with that address.`;
  });
}

export async function revokeMemberAction(_: FormState, formData: FormData) {
  return run("revoke", async () => {
    const actor = await signedIn();
    await revokeTeamMember(actor, str(formData, "membershipId") ?? "");
    revalidatePath("/dashboard", "layout");
    revalidatePath("/admin", "layout");
    return "Access removed. It takes effect immediately.";
  });
}

async function originOf() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3004";
  return `${proto}://${host}`;
}

export async function startCheckoutAction(_: FormState, formData: FormData) {
  let url: string | null = null;
  const result = await run("checkout", async () => {
    const actor = await signedIn();
    url = await startCheckout(actor, churchIdFromForm(formData), await originOf());
    return "Opening secure checkout…";
  });
  if (url) redirect(url);
  return result;
}

export async function openPortalAction(_: FormState, formData: FormData) {
  let url: string | null = null;
  const result = await run("portal", async () => {
    const actor = await signedIn();
    url = await openBillingPortal(actor, churchIdFromForm(formData), await originOf());
    return "Opening billing…";
  });
  if (url) redirect(url);
  return result;
}

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------

export async function reviewClaimAction(_: FormState, formData: FormData) {
  const decision = (str(formData, "decision") ?? "").toLowerCase();
  return doneRedirect(await reviewClaimRun(formData), "/admin/claims", `claim-${decision}`);
}

async function reviewClaimRun(formData: FormData) {
  return run("review-claim", async () => {
    const actor = await signedIn();
    await reviewClaim(actor, fields(formData));
    revalidatePath("/admin", "layout");
    const decision = str(formData, "decision");
    return decision === "APPROVED"
      ? "Approved. The applicant now owns the listing and was emailed sign-in instructions."
      : decision === "MORE_INFO"
        ? "Request for more information sent to the applicant."
        : "Claim declined and the applicant notified.";
  });
}

export async function reviewSubmissionAction(_: FormState, formData: FormData) {
  const decision = str(formData, "decision") === "APPROVED" ? "approved" : "rejected";
  return doneRedirect(await reviewSubmissionRun(formData), "/admin/submissions", `submission-${decision}`);
}

async function reviewSubmissionRun(formData: FormData) {
  return run("review-submission", async () => {
    const actor = await signedIn();
    const decision = str(formData, "decision") === "APPROVED" ? "APPROVED" : "REJECTED";
    const result = await reviewSubmission(actor, {
      submissionId: str(formData, "submissionId") ?? "",
      decision,
      note: str(formData, "note"),
      allowDuplicate: str(formData, "allowDuplicate") === "true"
    });
    revalidatePath("/admin", "layout");
    revalidatePath("/directory");
    return result.churchSlug ? `Published at /churches/${result.churchSlug}.` : "Submission declined and the submitter notified.";
  });
}

export async function resolveContactAction(_: FormState, formData: FormData) {
  const code = str(formData, "status") === "DISMISSED" ? "message-dismissed" : "message-resolved";
  return doneRedirect(await resolveContactRun(formData), "/admin/inbox", code);
}

async function resolveContactRun(formData: FormData) {
  return run("contact-resolve", async () => {
    const actor = await signedIn();
    await resolveContactMessage(actor, str(formData, "id") ?? "", str(formData, "status") === "DISMISSED" ? "DISMISSED" : "RESOLVED");
    revalidatePath("/admin/inbox");
    return "Updated.";
  });
}

export async function resolveCorrectionAction(_: FormState, formData: FormData) {
  const code = str(formData, "status") === "DISMISSED" ? "correction-dismissed" : "correction-resolved";
  return doneRedirect(await resolveCorrectionRun(formData), "/admin/inbox", code);
}

async function resolveCorrectionRun(formData: FormData) {
  return run("correction-resolve", async () => {
    const actor = await signedIn();
    await resolveCorrection(actor, str(formData, "id") ?? "", str(formData, "status") === "DISMISSED" ? "DISMISSED" : "RESOLVED", str(formData, "note"));
    revalidatePath("/admin/inbox");
    return "Updated.";
  });
}

export async function decideChangeAction(_: FormState, formData: FormData) {
  const code = str(formData, "decision") === "APPROVED" ? "change-approved" : "change-rejected";
  return doneRedirect(await decideChangeRun(formData), "/admin/review", code);
}

async function decideChangeRun(formData: FormData) {
  return run("decide-change", async () => {
    const actor = await signedIn();
    const decision = str(formData, "decision") === "APPROVED" ? "APPROVED" : "REJECTED";
    await decideSuggestedChange(actor, str(formData, "id") ?? "", decision, str(formData, "note"));
    revalidatePath("/admin/review");
    revalidatePath("/directory");
    return decision === "APPROVED" ? "Change applied to the listing." : "Proposal rejected; it will not be suggested again.";
  });
}

export async function moderateResourceAction(_: FormState, formData: FormData) {
  const code = str(formData, "decision") === "APPROVED" ? "resource-approved" : "resource-rejected";
  return doneRedirect(await moderateResourceRun(formData), "/admin/resources", code);
}

async function moderateResourceRun(formData: FormData) {
  return run("moderate-resource", async () => {
    const actor = await signedIn();
    const decision = str(formData, "decision") === "APPROVED" ? "APPROVED" : "REJECTED";
    await moderateResource(actor, str(formData, "id") ?? "", decision, str(formData, "note"));
    revalidatePath("/resources");
    revalidatePath("/admin/resources");
    return decision === "APPROVED" ? "Published." : "Rejected with your note.";
  });
}

export async function setChurchStatusAction(_: FormState, formData: FormData) {
  return run("church-status", async () => {
    const actor = await signedIn();
    const churchId = churchIdFromForm(formData);
    await setChurchStatus(actor, churchId, { status: str(formData, "status"), note: str(formData, "note"), mergeIntoSlug: str(formData, "mergeIntoSlug") });
    await revalidateChurch(churchId);
    return "Listing status updated.";
  });
}

export async function markSourceCheckedAction(_: FormState, formData: FormData) {
  return run("source-checked", async () => {
    const actor = await signedIn();
    const churchId = churchIdFromForm(formData);
    await markPublicSourceChecked(actor, churchId, str(formData, "sourceUrl"));
    await revalidateChurch(churchId);
    return "Recorded today’s check against the public source.";
  });
}

export async function setComplimentaryAction(_: FormState, formData: FormData) {
  return run("complimentary", async () => {
    const actor = await signedIn();
    const churchId = churchIdFromForm(formData);
    const remove = str(formData, "remove") === "true";
    await setComplimentary(actor, churchId, { until: remove ? null : str(formData, "until"), reason: str(formData, "reason") });
    await revalidateChurch(churchId);
    return remove ? "Complimentary enhanced profile removed." : "Complimentary enhanced profile granted.";
  });
}

export async function setStaffRoleAction(_: FormState, formData: FormData) {
  return run("staff-role", async () => {
    const actor = await signedIn();
    await setStaffRole(actor, fields(formData));
    revalidatePath("/admin/users");
    return "Role updated. It applies on the user’s next page load.";
  });
}

export async function setUserDisabledAction(_: FormState, formData: FormData) {
  return run("user-disable", async () => {
    const actor = await signedIn();
    const disable = str(formData, "disabled") === "true";
    await setUserDisabled(actor, str(formData, "userId") ?? "", disable);
    revalidatePath("/admin/users");
    return disable ? "Account disabled and signed out everywhere." : "Account re-enabled.";
  });
}

export async function revokeSessionsAction(_: FormState, formData: FormData) {
  return run("revoke-sessions", async () => {
    const actor = await signedIn();
    if (actor.kind !== "user" || actor.staffRole !== "ADMIN") throw new ValidationError("Administrator access is required.");
    const count = await endAllSessionsForUser(actor, str(formData, "userId") ?? "");
    revalidatePath("/admin/users");
    return `Signed out ${count} session(s).`;
  });
}

export async function runWebsiteReviewAction(_: FormState) {
  return run("scan-now", async () => {
    const actor = await signedIn();
    if (actor.kind !== "user" || (actor.staffRole !== "ADMIN" && actor.staffRole !== "REVIEWER")) {
      throw new ValidationError("Reviewer access is required.");
    }
    const result = await runWebsiteReview({ batchSize: 5 });
    revalidatePath("/admin/review");
    const outcomes = Object.entries(result.outcomes)
      .map(([k, v]) => `${v} ${k.toLowerCase().replace(/_/g, " ")}`)
      .join(", ");
    return `Checked ${result.checked} website(s)${outcomes ? `: ${outcomes}` : ""}. ${result.proposals} new proposal(s) queued for review.`;
  });
}

/**
 * Kept from the AI image feature, now disabled unless AI_IMAGES_ENABLED=true.
 * Even then, generated images are never shown publicly as the church's photo.
 */
export async function generateChurchImageAction(formData: FormData) {
  const actor = await signedIn();
  const churchSlug = str(formData, "churchSlug") ?? "";
  const returnPath = safeReturnPath(str(formData, "returnPath"), "/admin/images");
  if (actor.kind !== "user" || actor.staffRole !== "ADMIN") redirect(returnPath);
  const { generateChurchImage } = await import("@/lib/ai-church-image");
  const result = await generateChurchImage(churchSlug);
  const target = new URL(returnPath, "https://internal.invalid");
  target.searchParams.set("ai", result.status);
  redirect(`${target.pathname}${target.search}`);
}

// ---------------------------------------------------------------------------
// Campus Faith and the map
// ---------------------------------------------------------------------------

/** Like fields(), but keeps every value of multi-select checkbox groups. */
function fieldsWithLists(formData: FormData, listKeys: string[]) {
  const out = fields(formData);
  for (const key of listKeys) out[key] = formData.getAll(key).map(String);
  return out;
}

export async function submitOrganizationAction(_: FormState, formData: FormData) {
  return run("campus-org", async () => {
    assertHuman(formData);
    const result = await submitOrganization(fieldsWithLists(formData, ["campuses", "meetingTypes"]), await clientKey());
    return `Thank you. ${result.name} was submitted for review. We will email you when it is published or if we have questions.`;
  });
}

export async function submitCampusEventAction(_: FormState, formData: FormData) {
  return run("campus-event", async () => {
    assertHuman(formData);
    await submitCampusEvent(fieldsWithLists(formData, ["campuses", "categories"]), await clientKey());
    return "Thank you. The event was submitted for review and will appear on the calendar once approved.";
  });
}

export async function reviewOrganizationAction(_: FormState, formData: FormData) {
  return run("campus-org-review", async () => {
    const actor = await signedIn();
    const decision = str(formData, "decision");
    if (decision !== "APPROVED" && decision !== "REJECTED" && decision !== "CHANGES") throw new ValidationError("Choose a decision.");
    await reviewOrganization(actor, { id: str(formData, "id") ?? "", decision, note: str(formData, "note"), verify: str(formData, "verify") === "true" });
    revalidatePath("/campus", "layout");
    return "Saved.";
  }).then((r) => doneRedirect(r, "/admin/campus", "campus-org"));
}

export async function reviewCampusEventAction(_: FormState, formData: FormData) {
  return run("campus-event-review", async () => {
    const actor = await signedIn();
    const decision = str(formData, "decision");
    if (decision !== "APPROVED" && decision !== "REJECTED") throw new ValidationError("Choose a decision.");
    await reviewCampusEvent(actor, str(formData, "id") ?? "", decision, str(formData, "note"));
    revalidatePath("/campus", "layout");
    return "Saved.";
  }).then((r) => doneRedirect(r, "/admin/campus", "campus-event"));
}

export async function setStudentTagsAction(_: FormState, formData: FormData) {
  return run("student-tags", async () => {
    const actor = await signedIn();
    const churchId = churchIdFromForm(formData);
    await setStudentTags(actor, churchId, formData.getAll("studentTags").map(String));
    await revalidateChurch(churchId);
    revalidatePath("/campus", "layout");
    return "Student details saved. They now appear on your profile and in Student-Friendly Churches.";
  });
}

export async function setFeaturedAction(_: FormState, formData: FormData) {
  return run("featured", async () => {
    const actor = await signedIn();
    const churchId = churchIdFromForm(formData);
    const featured = str(formData, "featured") === "true";
    await setFeatured(actor, churchId, featured);
    await revalidateChurch(churchId);
    revalidatePath("/map");
    return featured ? "This church is now Featured (always labeled as such)." : "Featured placement removed.";
  });
}

export async function geocodeChurchesAction(_: FormState) {
  return run("geocode", async () => {
    const actor = await signedIn();
    assertAdmin(actor);
    const result = await geocodeMissingChurches({ limit: 40 });
    revalidatePath("/map");
    return `Checked ${result.checked} addresses: ${result.matched} placed on the map, ${result.unmatched} could not be matched and were left blank.`;
  });
}

export async function addPublicOrganizationAction(_: FormState, formData: FormData) {
  return run("campus-org-public", async () => {
    const actor = await signedIn();
    const org = await createPublicSourceOrganization(actor, fieldsWithLists(formData, ["campuses"]));
    revalidatePath("/campus", "layout");
    return `${org.name} is now listed, labeled “Compiled from public pages”.`;
  });
}
