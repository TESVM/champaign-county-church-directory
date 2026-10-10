import { z } from "zod";
import { type Actor, assertCanEditChurch, assertReviewer, isStaff } from "@/lib/actor";
import { COLLAB_CATEGORY_KEYS, MAX_POST_DAYS, REPORT_HIDE_THRESHOLD, REPORT_REASON_KEYS } from "@/lib/collab";
import { db } from "@/lib/db";
import { authSecret } from "@/lib/env";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { keyedHash, normalizeEmail } from "@/lib/security";
import { audit } from "@/lib/services/audit";
import { notifyPerson, notifyStaff } from "@/lib/services/email";
import { rateLimit } from "@/lib/services/rate-limit";
import { siteUrl } from "@/lib/site";
import { addDays, chicagoDateOf, chicagoToUtc, isValidDateString } from "@/lib/time/chicago";
import { LinkError, normalizeLink, normalizePhone } from "@/lib/validation/links";

/**
 * Church Collaboration Board: practical opportunities shared between
 * churches and ministries. Moderated, never a social feed: every post is
 * reviewed, expires, and can be reported.
 */

function fieldErrorsOf(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0] ?? "form")] ??= issue.message;
  return out;
}
const text = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

const postSchema = z
  .object({
    category: z.string().refine((v) => COLLAB_CATEGORY_KEYS.has(v), "Choose a category."),
    title: z.string().trim().min(5, "Give the post a short title.").max(120),
    body: z.string().trim().min(20, "Describe the opportunity (at least 20 characters).").max(2000),
    location: text(200),
    contactName: text(120),
    contactEmail: z.string().trim().max(254).optional().transform((v) => v || null).refine((v) => v === null || z.string().email().safeParse(v).success, "Enter a valid email address."),
    expiresOn: z.string().refine(isValidDateString, "Choose when this post should come down."),
    organizationName: text(140),
    consent: z.literal(true, { errorMap: () => ({ message: "Confirm the contact details may be shown publicly." }) })
  })
  .superRefine((v, ctx) => {
    const today = chicagoDateOf(new Date());
    if (v.expiresOn <= today) ctx.addIssue({ code: "custom", path: ["expiresOn"], message: "Choose a date after today." });
    if (v.expiresOn > addDays(today, MAX_POST_DAYS)) ctx.addIssue({ code: "custom", path: ["expiresOn"], message: `Posts can run for up to ${MAX_POST_DAYS} days; you can post again after.` });
  });

export async function submitCollabPost(actor: Actor, input: Record<string, unknown>) {
  const churchId = typeof input.churchId === "string" && input.churchId ? input.churchId : null;
  if (churchId) assertCanEditChurch(actor, churchId);
  else if (!isStaff(actor)) throw new ForbiddenError("Sign in as a church team member to post.");

  const parsed = postSchema.safeParse({ ...input, consent: input.consent === "true" || input.consent === "on" });
  const fieldErrors = parsed.success ? {} : fieldErrorsOf(parsed.error);
  let contactPhone: string | null = null;
  let contactUrl: string | null = null;
  try {
    contactPhone = normalizePhone(input.contactPhone);
  } catch (error) {
    fieldErrors.contactPhone = (error as LinkError).message;
  }
  try {
    contactUrl = normalizeLink(input.contactUrl, "website");
  } catch (error) {
    fieldErrors.contactUrl = (error as LinkError).message;
  }
  if (parsed.success && !parsed.data.contactEmail && !contactPhone && !contactUrl) fieldErrors.contactEmail ??= "Give at least one way to respond: email, phone, or link.";
  if (!churchId && parsed.success && !parsed.data.organizationName) fieldErrors.organizationName = "Name the ministry this is for.";
  if (!parsed.success || Object.keys(fieldErrors).length) throw new ValidationError("Please fix the highlighted fields. The post was not submitted.", fieldErrors);
  const d = parsed.data;
  await rateLimit("collab-post", actor.email, 10, 24 * 60 * 60);

  const prisma = await db();
  const post = await prisma.collabPost.create({
    data: {
      churchId,
      organizationName: churchId ? null : d.organizationName,
      category: d.category,
      title: d.title,
      body: d.body,
      location: d.location,
      contactName: d.contactName,
      contactEmail: d.contactEmail ? normalizeEmail(d.contactEmail) : null,
      contactPhone,
      contactUrl,
      expiresAt: chicagoToUtc(addDays(d.expiresOn, 1), "00:00"),
      createdBy: actor.email,
      // Staff posts are reviewed by the person posting them.
      ...(isStaff(actor) ? { status: "APPROVED" as const, reviewedBy: actor.email, reviewedAt: new Date() } : {})
    }
  });
  await audit(actor, { action: "collab.submitted", entityType: "CollabPost", entityId: post.id, churchId, summary: `Posted “${d.title}” to the Collaboration Board` });
  if (post.status === "PENDING") await notifyStaff(`Collaboration Board post to review: ${d.title}`, `${actor.email}\n\n${d.body}\n\n${siteUrl()}/admin/collaboration`);
  return post;
}

const live = (now: Date) => ({ status: "APPROVED" as const, closedAt: null, expiresAt: { gt: now } });

export async function listCollabPosts(options: { category?: string; churchId?: string; now?: Date } = {}) {
  const prisma = await db();
  const now = options.now ?? new Date();
  return prisma.collabPost.findMany({
    where: {
      ...live(now),
      ...(options.category && COLLAB_CATEGORY_KEYS.has(options.category) ? { category: options.category } : {}),
      ...(options.churchId ? { churchId: options.churchId } : {}),
      OR: [{ churchId: null }, { church: { status: "ACTIVE" } }]
    },
    include: { church: { select: { slug: true, name: true, city: true } } },
    orderBy: { createdAt: "desc" }
  });
}

export async function getCollabPost(id: string, now = new Date()) {
  const prisma = await db();
  const post = await prisma.collabPost.findUnique({ where: { id }, include: { church: { select: { slug: true, name: true, city: true, status: true } } } });
  if (!post || post.status !== "APPROVED" || post.closedAt || post.expiresAt <= now) return null;
  if (post.church && post.church.status !== "ACTIVE") return null;
  return post;
}

export async function listCollabPostsForChurch(actor: Actor, churchId: string) {
  assertCanEditChurch(actor, churchId);
  const prisma = await db();
  return prisma.collabPost.findMany({ where: { churchId }, orderBy: { createdAt: "desc" }, take: 50 });
}

/** The poster (or staff) takes a post down early, e.g. once a need is met. */
export async function closeCollabPost(actor: Actor, id: string) {
  const prisma = await db();
  const post = await prisma.collabPost.findUnique({ where: { id } });
  if (!post) throw new NotFoundError();
  if (post.churchId) assertCanEditChurch(actor, post.churchId);
  else assertReviewer(actor);
  await prisma.collabPost.update({ where: { id }, data: { closedAt: new Date() } });
  await audit(actor, { action: "collab.closed", entityType: "CollabPost", entityId: id, churchId: post.churchId, summary: `Took down “${post.title}”` });
}

export async function reportCollabPost(id: string, reason: unknown, clientKey: string) {
  if (typeof reason !== "string" || !REPORT_REASON_KEYS.has(reason)) throw new ValidationError("Choose a reason.", { reason: "Choose a reason." });
  await rateLimit("collab-report", clientKey, 10, 24 * 60 * 60);
  const prisma = await db();
  const post = await prisma.collabPost.findUnique({ where: { id } });
  if (!post || post.status !== "APPROVED") throw new NotFoundError();
  const reporterKey = keyedHash(clientKey, `${authSecret}:collab-report`);
  const existing = await prisma.collabReport.findUnique({ where: { postId_reporterKey: { postId: id, reporterKey } } });
  if (existing) return { hidden: false, duplicate: true };
  await prisma.collabReport.create({ data: { postId: id, reason, reporterKey } });
  const updated = await prisma.collabPost.update({ where: { id }, data: { reportCount: { increment: 1 } } });
  const hide = updated.reportCount >= REPORT_HIDE_THRESHOLD;
  if (hide) await prisma.collabPost.update({ where: { id }, data: { status: "PENDING", reviewerNote: `Hidden automatically after ${updated.reportCount} reports.` } });
  await notifyStaff(`Collaboration Board post reported${hide ? " and hidden" : ""}: ${post.title}`, `Reason: ${reason}\nReports so far: ${updated.reportCount}\n\n${siteUrl()}/admin/collaboration`);
  return { hidden: hide, duplicate: false };
}

export async function listCollabForReview(actor: Actor, view: "PENDING" | "REPORTED" | "APPROVED" | "REJECTED" | "ALL" = "PENDING") {
  assertReviewer(actor);
  const prisma = await db();
  return prisma.collabPost.findMany({
    where:
      view === "ALL" ? undefined : view === "REPORTED" ? { reports: { some: { resolvedAt: null } } } : { status: view },
    include: { church: { select: { slug: true, name: true } }, reports: { where: { resolvedAt: null }, select: { reason: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
    take: 200
  });
}

export async function reviewCollabPost(actor: Actor, id: string, decision: "APPROVED" | "REJECTED" | "REMOVED" | "DISMISS_REPORTS", note?: string) {
  assertReviewer(actor);
  if ((decision === "REJECTED" || decision === "REMOVED") && !note?.trim()) throw new ValidationError("Add a note for the poster explaining why.", { note: "Required." });
  const prisma = await db();
  const post = await prisma.collabPost.findUnique({ where: { id }, include: { church: { select: { name: true } } } });
  if (!post) throw new NotFoundError();
  const now = new Date();
  if (decision === "DISMISS_REPORTS") {
    await prisma.$transaction([
      prisma.collabReport.updateMany({ where: { postId: id, resolvedAt: null }, data: { resolvedAt: now } }),
      prisma.collabPost.update({ where: { id }, data: { reportCount: 0, status: "APPROVED", reviewerNote: note || null, reviewedBy: actor.email, reviewedAt: now } })
    ]);
  } else {
    await prisma.$transaction([
      prisma.collabReport.updateMany({ where: { postId: id, resolvedAt: null }, data: { resolvedAt: now } }),
      prisma.collabPost.update({
        where: { id },
        data: { status: decision === "APPROVED" ? "APPROVED" : "REJECTED", reviewerNote: note || null, reviewedBy: actor.email, reviewedAt: now }
      })
    ]);
  }
  await audit(actor, { action: `collab.${decision.toLowerCase()}`, entityType: "CollabPost", entityId: id, churchId: post.churchId, summary: `${decision === "APPROVED" ? "Approved" : decision === "DISMISS_REPORTS" ? "Kept (reports dismissed)" : decision === "REMOVED" ? "Removed" : "Declined"} “${post.title}”` });
  if (decision !== "DISMISS_REPORTS") {
    await notifyPerson(
      post.createdBy,
      `About your Collaboration Board post: ${post.title}`,
      decision === "APPROVED" ? `“${post.title}” is now on the Church Collaboration Board: ${siteUrl()}/collaborate/${post.id}` : `“${post.title}” is not on the Collaboration Board:\n\n${note}`
    );
  }
}
