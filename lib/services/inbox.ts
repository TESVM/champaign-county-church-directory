import { z } from "zod";
import { type Actor, assertReviewer, assertStaff } from "@/lib/actor";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { normalizeEmail } from "@/lib/security";
import { audit } from "@/lib/services/audit";
import { findPossibleDuplicates, uniqueSlug } from "@/lib/services/churches";
import { notifyPerson, notifyStaff } from "@/lib/services/email";
import { rateLimit } from "@/lib/services/rate-limit";
import { siteUrl } from "@/lib/site";
import { parseTimeToMinutes } from "@/lib/time/chicago";
import { LinkError, normalizeLink, normalizePhone } from "@/lib/validation/links";

/**
 * Contact messages, new-church submissions, and visitor correction reports.
 * Each is written to the database before any confirmation is shown.
 */

function fieldErrorsOf(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0] ?? "form")] ??= issue.message;
  return out;
}

const URL_PATTERN = /https?:\/\//gi;

/** Rejects obvious link spam in free-text fields. */
function assertNotLinkSpam(text: string, field: string) {
  if ((text.match(URL_PATTERN) ?? []).length > 3) {
    throw new ValidationError("Please include no more than three links.", { [field]: "Too many links." });
  }
}

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  organization: z.string().trim().max(160).optional(),
  message: z.string().trim().min(10, "Your message needs at least 10 characters.").max(5000)
});

export async function submitContactMessage(input: Record<string, unknown>, clientKey: string) {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("Please fix the highlighted fields. Your message was not sent.", fieldErrorsOf(parsed.error));
  assertNotLinkSpam(parsed.data.message, "message");
  await rateLimit("contact", clientKey, 5, 60 * 60);

  const prisma = await db();
  const message = await prisma.contactMessage.create({
    data: {
      name: parsed.data.name,
      email: normalizeEmail(parsed.data.email),
      organization: parsed.data.organization || null,
      message: parsed.data.message
    }
  });
  await notifyStaff(
    `Contact message from ${parsed.data.name}`,
    `${parsed.data.name} <${parsed.data.email}>${parsed.data.organization ? ` (${parsed.data.organization})` : ""}\n\n${parsed.data.message}\n\n${siteUrl()}/admin/inbox`
  );
  return { id: message.id };
}

export async function listContactMessages(actor: Actor, status = "NEW") {
  assertStaff(actor);
  const prisma = await db();
  return prisma.contactMessage.findMany({
    where: status === "ALL" ? undefined : { status: status as "NEW" },
    orderBy: { createdAt: "desc" },
    take: 200
  });
}

export async function resolveContactMessage(actor: Actor, id: string, status: "RESOLVED" | "DISMISSED") {
  assertStaff(actor);
  const prisma = await db();
  await prisma.contactMessage.update({ where: { id }, data: { status, resolvedAt: new Date(), resolvedBy: actor.email } });
  await audit(actor, { action: `contact.${status.toLowerCase()}`, entityType: "ContactMessage", entityId: id, summary: `Marked contact message ${status.toLowerCase()}` });
}

// ---------------------------------------------------------------------------
// New church submissions
// ---------------------------------------------------------------------------

const submissionSchema = z.object({
  churchName: z.string().trim().min(2, "Enter the church name.").max(140),
  citySlug: z.string().trim().min(1, "Choose the city."),
  address1: z.string().trim().min(3, "Enter the street address.").max(160),
  zip: z.string().trim().regex(/^\d{5}$/, "Enter a 5-digit ZIP code.").optional().or(z.literal("")),
  denomination: z.string().trim().max(80).optional(),
  seniorPastor: z.string().trim().max(120).optional(),
  serviceTimes: z.string().trim().min(3, "List at least one service time, for example “Sunday 10:30 AM”.").max(1000),
  description: z.string().trim().max(3000).optional(),
  contactName: z.string().trim().min(2, "Enter your name.").max(120),
  contactEmail: z.string().trim().email("Enter a valid email address.").max(254),
  relationship: z.string().trim().max(200).optional()
});

export type SubmissionData = z.infer<typeof submissionSchema> & {
  phone: string | null;
  websiteUrl: string | null;
  churchEmail: string | null;
};

export async function submitNewChurch(input: Record<string, unknown>, clientKey: string) {
  const parsed = submissionSchema.safeParse(input);
  const fieldErrors: Record<string, string> = parsed.success ? {} : fieldErrorsOf(parsed.error);

  let websiteUrl: string | null = null;
  let phone: string | null = null;
  let churchEmail: string | null = null;
  try {
    websiteUrl = normalizeLink(input.websiteUrl, "website");
  } catch (error) {
    fieldErrors.websiteUrl = (error as LinkError).message;
  }
  try {
    phone = normalizePhone(input.phone);
  } catch (error) {
    fieldErrors.phone = (error as LinkError).message;
  }
  const rawChurchEmail = String(input.churchEmail ?? "").trim();
  if (rawChurchEmail) {
    if (z.string().email().safeParse(rawChurchEmail).success) churchEmail = rawChurchEmail.toLowerCase();
    else fieldErrors.churchEmail = "Enter a valid church email address.";
  }

  if (!parsed.success || Object.keys(fieldErrors).length) {
    throw new ValidationError("Please fix the highlighted fields. The church was not submitted.", fieldErrors);
  }
  assertNotLinkSpam(parsed.data.description ?? "", "description");
  await rateLimit("submission", clientKey, 5, 60 * 60);

  const prisma = await db();
  const city = await prisma.city.findUnique({ where: { slug: parsed.data.citySlug } });
  if (!city) throw new ValidationError("Choose a Champaign County city.", { citySlug: "Choose a city from the list." });

  const duplicates = await findPossibleDuplicates(parsed.data.churchName, city.name, parsed.data.address1);
  const active = duplicates.filter((d) => d.status === "ACTIVE");
  if (active.length) {
    throw new ValidationError(
      `It looks like ${active[0].name} is already listed. If its details are out of date, use “Report outdated information” on its page instead.`,
      { churchName: `Possible duplicate of ${active[0].name} (/churches/${active[0].slug}).` }
    );
  }

  const data: SubmissionData = { ...parsed.data, phone, websiteUrl, churchEmail };
  const submission = await prisma.submission.create({
    data: {
      churchName: data.churchName,
      contactName: data.contactName,
      contactEmail: normalizeEmail(data.contactEmail),
      contactPhone: phone,
      message: data.relationship || null,
      submittedDataJson: data
    }
  });

  await notifyStaff(
    `New church submitted: ${data.churchName}`,
    `${data.contactName} <${data.contactEmail}> submitted ${data.churchName} (${city.name}).\n\nReview: ${siteUrl()}/admin/submissions`
  );
  return { id: submission.id };
}

export async function listSubmissions(actor: Actor, status = "PENDING") {
  assertReviewer(actor);
  const prisma = await db();
  const rows = await prisma.submission.findMany({
    where: status === "ALL" ? undefined : { status: status as "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  return Promise.all(
    rows.map(async (row) => {
      const data = row.submittedDataJson as unknown as SubmissionData;
      const duplicates = row.status === "PENDING" ? await findPossibleDuplicates(data.churchName, null, data.address1) : [];
      return { ...row, data, duplicates };
    })
  );
}

const SERVICE_LINE = /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)s?\b[\s,:-]*(\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?)/i;

/** Best-effort parse of "Sunday 10:30 AM" lines. Unparsed lines are kept in the description for review. */
export function parseServiceLines(text: string) {
  const parsed: Array<{ dayOfWeek: string; startTime: string; startMinutes: number }> = [];
  for (const line of text.split(/\n|;/).map((l) => l.trim()).filter(Boolean)) {
    const match = SERVICE_LINE.exec(line);
    if (!match) continue;
    const minutes = parseTimeToMinutes(match[2]);
    if (minutes === null) continue;
    const day = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
    const h = Math.floor(minutes / 60);
    parsed.push({
      dayOfWeek: day,
      startTime: `${h % 12 === 0 ? 12 : h % 12}:${String(minutes % 60).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`,
      startMinutes: minutes
    });
  }
  return parsed;
}

export async function reviewSubmission(
  actor: Actor,
  input: { submissionId: string; decision: "APPROVED" | "REJECTED"; note?: string; allowDuplicate?: boolean }
) {
  assertReviewer(actor);
  const prisma = await db();
  const submission = await prisma.submission.findUnique({ where: { id: input.submissionId } });
  if (!submission) throw new NotFoundError();
  if (submission.status !== "PENDING") throw new ValidationError("This submission has already been reviewed.");
  const data = submission.submittedDataJson as unknown as SubmissionData;

  if (input.decision === "REJECTED") {
    if (!input.note?.trim()) throw new ValidationError("Add a note for the submitter explaining why.", { note: "Required to decline." });
    await prisma.submission.update({
      where: { id: submission.id },
      data: { status: "REJECTED", reviewerNote: input.note, reviewedAt: new Date(), reviewedBy: actor.email }
    });
    await audit(actor, { action: "submission.rejected", entityType: "Submission", entityId: submission.id, summary: `Declined new listing ${data.churchName}` });
    await notifyPerson(
      submission.contactEmail,
      `About your submission of ${data.churchName}`,
      `Thank you for suggesting ${data.churchName}. We were not able to add it:\n\n${input.note}`
    );
    return { churchSlug: null };
  }

  const city = await prisma.city.findUnique({ where: { slug: data.citySlug } });
  if (!city) throw new ValidationError("The submitted city no longer exists.");
  const duplicates = (await findPossibleDuplicates(data.churchName, city.name, data.address1)).filter((d) => d.status === "ACTIVE");
  if (duplicates.length && !input.allowDuplicate) {
    throw new ValidationError(
      `Possible duplicate of ${duplicates.map((d) => d.name).join(", ")}. Tick “not a duplicate” to approve anyway.`,
      { allowDuplicate: "Confirm this is a different congregation." }
    );
  }

  const slug = await uniqueSlug(`${data.churchName} ${city.name}`);
  const services = parseServiceLines(data.serviceTimes);
  const unparsed = services.length === 0 ? `\n\nService times as submitted: ${data.serviceTimes}` : "";

  const church = await prisma.$transaction(async (tx) => {
    const pastor = data.seniorPastor
      ? await tx.pastor.create({ data: { fullName: data.seniorPastor, title: "Pastor" } })
      : null;
    const created = await tx.church.create({
      data: {
        slug,
        name: data.churchName,
        cityId: city.id,
        city: city.name,
        state: "IL",
        address1: data.address1,
        zip: data.zip || null,
        phone: data.phone,
        email: data.churchEmail,
        websiteUrl: data.websiteUrl,
        denomination: data.denomination || null,
        description: `${data.description ?? ""}${unparsed}`.trim() || null,
        seniorPastorId: pastor?.id ?? null,
        verified: false,
        lastUpdatedAt: new Date()
      }
    });
    if (services.length) {
      await tx.serviceTime.createMany({
        data: services.map((s) => ({ churchId: created.id, serviceName: "Worship Service", ...s }))
      });
    }
    await tx.submission.update({
      where: { id: submission.id },
      data: { status: "APPROVED", reviewerNote: input.note || null, reviewedAt: new Date(), reviewedBy: actor.email, createdChurchId: created.id }
    });
    await audit(
      actor,
      { action: "submission.approved", entityType: "Submission", entityId: submission.id, churchId: created.id, summary: `Approved new listing ${data.churchName}` },
      tx
    );
    return created;
  });

  await notifyPerson(
    submission.contactEmail,
    `${data.churchName} is now listed`,
    `Thank you. ${data.churchName} is now in the Champaign County Church Directory:\n${siteUrl()}/churches/${church.slug}\n\nChurch leaders can request to manage the listing at ${siteUrl()}/claim?church=${church.slug}`
  );
  return { churchSlug: church.slug };
}

// ---------------------------------------------------------------------------
// Visitor correction reports
// ---------------------------------------------------------------------------

export const CORRECTION_FIELDS = [
  { value: "serviceTimes", label: "Service times" },
  { value: "address", label: "Address or location" },
  { value: "phone", label: "Phone or email" },
  { value: "pastor", label: "Pastor or leadership" },
  { value: "website", label: "Website or online links" },
  { value: "closed", label: "Church has closed or moved" },
  { value: "photo", label: "Photo" },
  { value: "other", label: "Something else" }
] as const;

const correctionSchema = z.object({
  churchSlug: z.string().min(1),
  fieldName: z.enum(CORRECTION_FIELDS.map((f) => f.value) as [string, ...string[]]).optional(),
  details: z.string().trim().min(5, "Tell us what is out of date (at least 5 characters).").max(2000),
  reporterName: z.string().trim().max(120).optional(),
  reporterEmail: z.string().trim().email("Enter a valid email or leave it blank.").max(254).optional().or(z.literal(""))
});

export async function submitCorrection(input: Record<string, unknown>, clientKey: string) {
  const parsed = correctionSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("Please fix the highlighted fields. Your report was not sent.", fieldErrorsOf(parsed.error));
  assertNotLinkSpam(parsed.data.details, "details");
  await rateLimit("correction", clientKey, 10, 60 * 60);

  const prisma = await db();
  const church = await prisma.church.findUnique({
    where: { slug: parsed.data.churchSlug },
    include: { memberships: { where: { status: "ACTIVE" }, include: { user: { select: { email: true } } } } }
  });
  if (!church) throw new ValidationError("That church was not found.");

  const report = await prisma.correctionReport.create({
    data: {
      churchId: church.id,
      fieldName: parsed.data.fieldName ?? null,
      details: parsed.data.details,
      reporterName: parsed.data.reporterName || null,
      reporterEmail: parsed.data.reporterEmail ? normalizeEmail(parsed.data.reporterEmail) : null
    }
  });

  const body = `A visitor reported outdated information on ${church.name}${parsed.data.fieldName ? ` (${parsed.data.fieldName})` : ""}:\n\n${parsed.data.details}`;
  await notifyStaff(`Correction reported: ${church.name}`, `${body}\n\n${siteUrl()}/admin/inbox`);
  for (const member of church.memberships) {
    await notifyPerson(member.user.email, `A visitor reported outdated information on ${church.name}`, `${body}\n\nUpdate your listing: ${siteUrl()}/dashboard/churches/${church.slug}`);
  }
  return { id: report.id };
}

export async function listCorrections(actor: Actor, status = "NEW") {
  assertStaff(actor);
  const prisma = await db();
  return prisma.correctionReport.findMany({
    where: status === "ALL" ? undefined : { status: status as "NEW" },
    include: { church: { select: { slug: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200
  });
}

export async function resolveCorrection(actor: Actor, id: string, status: "RESOLVED" | "DISMISSED", note?: string) {
  assertStaff(actor);
  const prisma = await db();
  const report = await prisma.correctionReport.update({
    where: { id },
    data: { status, reviewerNote: note || null, resolvedAt: new Date(), resolvedBy: actor.email },
    include: { church: { select: { name: true } } }
  });
  await audit(actor, {
    action: `correction.${status.toLowerCase()}`,
    entityType: "CorrectionReport",
    entityId: id,
    churchId: report.churchId,
    summary: `Marked correction for ${report.church.name} ${status.toLowerCase()}`
  });
  if (report.reporterEmail && status === "RESOLVED") {
    await notifyPerson(report.reporterEmail, `Thanks — ${report.church.name} has been reviewed`, `Thank you for your report about ${report.church.name}. A reviewer has looked into it.${note ? `\n\n${note}` : ""}`);
  }
}
