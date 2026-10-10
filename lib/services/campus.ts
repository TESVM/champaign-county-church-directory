import { z } from "zod";
import { type Actor, assertCanEditChurch, assertReviewer, isStaff } from "@/lib/actor";
import { CAMPUS_ANCHORS, CAMPUS_KEYS, EVENT_CATEGORY_KEYS, MEETING_TYPE_KEYS, STUDENT_MINISTRY_PATTERN, milesBetween } from "@/lib/campus";
import { churchInclude, mapChurchRow, slugify } from "@/lib/services/churches";
import type { ChurchRecord } from "@/lib/types";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { normalizeEmail } from "@/lib/security";
import { audit } from "@/lib/services/audit";
import { notifyPerson, notifyStaff } from "@/lib/services/email";
import { computeEntitlement } from "@/lib/services/entitlements";
import { expandOccurrences } from "@/lib/services/engagement";
import { rateLimit } from "@/lib/services/rate-limit";
import { siteUrl } from "@/lib/site";
import { addDays, chicagoDateOf, chicagoToUtc, isValidDateString, isValidTimeString } from "@/lib/time/chicago";
import { LinkError, normalizeLink } from "@/lib/validation/links";

/**
 * Campus Faith: campus ministries and student organizations, their events,
 * and the Student-Friendly Churches collection. Everything submitted by the
 * public is PENDING until a reviewer approves it.
 */

function fieldErrorsOf(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0] ?? "form")] ??= issue.message;
  return out;
}

const list = (value: unknown) => (Array.isArray(value) ? value : value == null || value === "" ? [] : [value]).map(String);
const text = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

const orgSchema = z.object({
  name: z.string().trim().min(2, "Enter the organization name.").max(140),
  campuses: z.array(z.string()).min(1, "Choose at least one campus.").refine((v) => v.every((c) => CAMPUS_KEYS.has(c)), "Choose campuses from the list."),
  affiliation: text(140),
  description: z.string().trim().min(20, "Describe what you are about (at least 20 characters).").max(2000),
  whoIsWelcome: text(500),
  meetingDay: text(60),
  meetingTime: text(60),
  meetingLocation: text(200),
  meetingTypes: z.array(z.string()).refine((v) => v.every((t) => MEETING_TYPE_KEYS.has(t)), "Choose meeting types from the list."),
  firstTimeNote: text(1000),
  accessibilityNote: text(500),
  churchPartner: text(140),
  submitterName: z.string().trim().min(2, "Enter your name.").max(120),
  submitterRole: z.string().trim().min(2, "Enter your role.").max(120),
  submitterEmail: z.string().trim().email("Enter a valid email address.").max(254),
  publishContact: z.boolean(),
  consentToPublish: z.literal(true, { errorMap: () => ({ message: "Please confirm we may publish the information you supplied." }) })
});

export async function submitOrganization(input: Record<string, unknown>, clientKey: string) {
  const parsed = orgSchema.safeParse({
    ...input,
    campuses: list(input.campuses),
    meetingTypes: list(input.meetingTypes),
    publishContact: input.publishContact === "true" || input.publishContact === "on",
    consentToPublish: input.consentToPublish === "true" || input.consentToPublish === "on"
  });
  const fieldErrors = parsed.success ? {} : fieldErrorsOf(parsed.error);
  const links: Record<string, string | null> = {};
  for (const [key, kind] of [
    ["websiteUrl", "website"],
    ["instagramUrl", "instagram"],
    ["facebookUrl", "facebook"],
    ["otherSocialUrl", "website"],
    ["registrationUrl", "website"],
    ["logoUrl", "image"]
  ] as const) {
    try {
      links[key] = normalizeLink(input[key], kind);
    } catch (error) {
      fieldErrors[key] = (error as LinkError).message;
    }
  }
  if (!parsed.success || Object.keys(fieldErrors).length) {
    throw new ValidationError("Please fix the highlighted fields. Your organization was not submitted.", fieldErrors);
  }
  const data = parsed.data;
  await rateLimit("campus-org", clientKey, 5, 60 * 60);

  const prisma = await db();
  let slug = slugify(data.name) || "campus-organization";
  for (let i = 2; await prisma.campusOrganization.findUnique({ where: { slug }, select: { id: true } }); i += 1) slug = `${slugify(data.name)}-${i}`;
  const email = normalizeEmail(data.submitterEmail);

  const org = await prisma.campusOrganization.create({
    data: {
      slug,
      name: data.name,
      campuses: data.campuses,
      affiliation: [data.affiliation, data.churchPartner ? `Partner church: ${data.churchPartner}` : null].filter(Boolean).join(" · ") || null,
      description: data.description,
      whoIsWelcome: data.whoIsWelcome,
      meetingDay: data.meetingDay,
      meetingTime: data.meetingTime,
      meetingLocation: data.meetingLocation,
      meetingTypes: data.meetingTypes,
      firstTimeNote: data.firstTimeNote,
      accessibilityNote: data.accessibilityNote,
      ...links,
      submitterName: data.submitterName,
      submitterRole: data.submitterRole,
      submitterEmail: email,
      publishContact: data.publishContact,
      publicContactName: data.publishContact ? data.submitterName : null,
      publicContactRole: data.publishContact ? data.submitterRole : null,
      publicContactEmail: data.publishContact ? email : null,
      consentToPublish: true,
      source: "organization",
      claimed: true,
      lastCheckedAt: new Date()
    }
  });
  await audit({ kind: "anonymous" }, { action: "campus_org.submitted", entityType: "CampusOrganization", entityId: org.id, summary: `${data.submitterName} (${data.submitterRole}) submitted ${data.name}` });
  await notifyStaff(`Campus organization to review: ${data.name}`, `${data.submitterName} <${email}>, ${data.submitterRole}\n\n${data.description}\n\nReview: ${siteUrl()}/admin/campus`);
  await notifyPerson(email, `We received ${data.name}`, `Thank you for listing ${data.name} in Campus Faith. A reviewer checks every listing before it is published, and we will email you when it is live or if we have questions.`);
  return { slug: org.slug, name: org.name };
}

export async function listOrganizations(options: { campus?: string; type?: string; q?: string } = {}) {
  const prisma = await db();
  return prisma.campusOrganization.findMany({
    where: {
      status: "APPROVED",
      ...(options.campus && CAMPUS_KEYS.has(options.campus) ? { campuses: { has: options.campus } } : {}),
      ...(options.type && MEETING_TYPE_KEYS.has(options.type) ? { meetingTypes: { has: options.type } } : {}),
      ...(options.q
        ? {
            OR: [
              { name: { contains: options.q, mode: "insensitive" } },
              { description: { contains: options.q, mode: "insensitive" } },
              { affiliation: { contains: options.q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: [{ name: "asc" }]
  });
}

export async function getOrganization(slug: string, actor?: Actor) {
  const prisma = await db();
  const org = await prisma.campusOrganization.findUnique({ where: { slug }, include: { church: { select: { slug: true, name: true } } } });
  if (!org) return null;
  if (org.status !== "APPROVED" && !(actor && isStaff(actor))) return null;
  return org;
}

export async function listOrganizationsForReview(actor: Actor, status = "PENDING") {
  assertReviewer(actor);
  const prisma = await db();
  return prisma.campusOrganization.findMany({
    where: status === "ALL" ? undefined : { status: status as "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 200
  });
}

export async function reviewOrganization(actor: Actor, input: { id: string; decision: "APPROVED" | "REJECTED" | "CHANGES"; note?: string; verify?: boolean }) {
  assertReviewer(actor);
  const prisma = await db();
  const org = await prisma.campusOrganization.findUnique({ where: { id: input.id } });
  if (!org) throw new NotFoundError();
  if ((input.decision === "REJECTED" || input.decision === "CHANGES") && !input.note?.trim()) {
    throw new ValidationError("Add a note for the organization explaining what is needed.", { note: "Required for this decision." });
  }
  const now = new Date();
  await prisma.campusOrganization.update({
    where: { id: org.id },
    data: {
      status: input.decision === "CHANGES" ? "PENDING" : input.decision,
      reviewerNote: input.note || null,
      reviewedBy: actor.email,
      reviewedAt: now,
      lastCheckedAt: input.decision === "APPROVED" ? now : org.lastCheckedAt,
      ...(input.verify ? { verifiedAt: now } : {})
    }
  });
  await audit(actor, {
    action: `campus_org.${input.decision.toLowerCase()}`,
    entityType: "CampusOrganization",
    entityId: org.id,
    summary: `${input.decision === "APPROVED" ? "Approved" : input.decision === "REJECTED" ? "Declined" : "Requested changes to"} ${org.name}${input.verify ? " (verified)" : ""}`
  });
  if (org.submitterEmail) {
    const body =
      input.decision === "APPROVED"
        ? `${org.name} is now listed in Campus Faith: ${siteUrl()}/campus/organizations/${org.slug}\n\nTo change anything later, reply to this email or use ${siteUrl()}/contact.`
        : input.decision === "CHANGES"
          ? `Before we publish ${org.name}, a reviewer asked for a change:\n\n${input.note}\n\nReply to this email or resubmit at ${siteUrl()}/campus/list-your-organization.`
          : `We were not able to publish ${org.name}:\n\n${input.note}`;
    await notifyPerson(org.submitterEmail, `About your Campus Faith listing: ${org.name}`, body);
  }
}

export async function setOrganizationVerified(actor: Actor, id: string, verified: boolean) {
  assertReviewer(actor);
  const prisma = await db();
  const org = await prisma.campusOrganization.update({ where: { id }, data: { verifiedAt: verified ? new Date() : null, lastCheckedAt: new Date() } });
  await audit(actor, { action: verified ? "campus_org.verified" : "campus_org.unverified", entityType: "CampusOrganization", entityId: id, summary: `${verified ? "Verified" : "Removed verification for"} ${org.name}` });
}

// ---------------------------------------------------------------------------
// Campus events
// ---------------------------------------------------------------------------

const eventSchema = z
  .object({
    title: z.string().trim().min(3, "Give the event a title.").max(120),
    description: text(2000),
    location: text(200),
    startDate: z.string().refine(isValidDateString, "Choose a date."),
    startTime: z.string().optional().transform((v) => v || null).refine((v) => v === null || isValidTimeString(v), "Use a time like 19:00."),
    endTime: z.string().optional().transform((v) => v || null).refine((v) => v === null || isValidTimeString(v), "Use a time like 20:30."),
    campuses: z.array(z.string()).min(1, "Choose at least one campus.").refine((v) => v.every((c) => CAMPUS_KEYS.has(c)), "Choose campuses from the list."),
    categories: z.array(z.string()).min(1, "Choose at least one category.").refine((v) => v.every((c) => EVENT_CATEGORY_KEYS.has(c)), "Choose categories from the list."),
    organizationSlug: z.string().optional(),
    hostName: text(140),
    submitterName: z.string().trim().min(2, "Enter your name.").max(120),
    submitterEmail: z.string().trim().email("Enter a valid email address.").max(254)
  })
  .superRefine((v, ctx) => {
    if (v.endTime && v.startTime && v.endTime <= v.startTime) ctx.addIssue({ code: "custom", path: ["endTime"], message: "The end time must be after the start time." });
    const today = chicagoDateOf(new Date());
    if (v.startDate < today) ctx.addIssue({ code: "custom", path: ["startDate"], message: "The event date is in the past." });
    if (v.startDate > addDays(today, 365)) ctx.addIssue({ code: "custom", path: ["startDate"], message: "Events can be submitted up to a year ahead." });
  });

export async function submitCampusEvent(input: Record<string, unknown>, clientKey: string) {
  const parsed = eventSchema.safeParse({ ...input, campuses: list(input.campuses), categories: list(input.categories) });
  const fieldErrors = parsed.success ? {} : fieldErrorsOf(parsed.error);
  let registrationUrl: string | null = null;
  try {
    registrationUrl = normalizeLink(input.registrationUrl, "registration");
  } catch (error) {
    fieldErrors.registrationUrl = (error as LinkError).message;
  }
  if (!parsed.success || Object.keys(fieldErrors).length) throw new ValidationError("Please fix the highlighted fields. The event was not submitted.", fieldErrors);
  const d = parsed.data;
  await rateLimit("campus-event", clientKey, 10, 60 * 60);
  const prisma = await db();
  const org = d.organizationSlug ? await prisma.campusOrganization.findFirst({ where: { slug: d.organizationSlug, status: "APPROVED" } }) : null;
  if (!org && !d.hostName) throw new ValidationError("Choose your organization or enter the host's name.", { hostName: "Who is hosting?" });
  const event = await prisma.campusEvent.create({
    data: {
      organizationId: org?.id ?? null,
      title: d.title,
      description: [d.description, !org && d.hostName ? `Hosted by ${d.hostName}` : null].filter(Boolean).join("\n\n") || null,
      location: d.location,
      startDate: d.startDate,
      startTime: d.startTime,
      endTime: d.endTime,
      startsAt: chicagoToUtc(d.startDate, d.startTime ?? "00:00"),
      campuses: d.campuses,
      categories: d.categories,
      registrationUrl,
      submitterName: d.submitterName,
      submitterEmail: normalizeEmail(d.submitterEmail)
    }
  });
  await notifyStaff(`Campus event to review: ${d.title}`, `${d.submitterName} <${d.submitterEmail}> submitted "${d.title}" on ${d.startDate}.\n\n${siteUrl()}/admin/campus`);
  return { id: event.id };
}

export async function listCampusEventsForReview(actor: Actor, status = "PENDING") {
  assertReviewer(actor);
  const prisma = await db();
  return prisma.campusEvent.findMany({
    where: status === "ALL" ? undefined : { status: status as "PENDING" },
    include: { organization: { select: { name: true, slug: true } } },
    orderBy: { startsAt: "asc" },
    take: 200
  });
}

export async function reviewCampusEvent(actor: Actor, id: string, decision: "APPROVED" | "REJECTED", note?: string) {
  assertReviewer(actor);
  if (decision === "REJECTED" && !note?.trim()) throw new ValidationError("Add a note explaining why.", { note: "Required to decline." });
  const prisma = await db();
  const event = await prisma.campusEvent.update({ where: { id }, data: { status: decision, reviewerNote: note || null, reviewedBy: actor.email, reviewedAt: new Date() } });
  await audit(actor, { action: `campus_event.${decision.toLowerCase()}`, entityType: "CampusEvent", entityId: id, summary: `${decision === "APPROVED" ? "Published" : "Declined"} campus event “${event.title}”` });
  if (event.submitterEmail) {
    await notifyPerson(
      event.submitterEmail,
      `About your campus event: ${event.title}`,
      decision === "APPROVED" ? `“${event.title}” is now on the Campus Faith events calendar: ${siteUrl()}/campus/events` : `We were not able to publish “${event.title}”:\n\n${note}`
    );
  }
}

export type CampusOccurrence = {
  key: string;
  icsUrl: string;
  title: string;
  description: string | null;
  location: string | null;
  registrationUrl: string | null;
  date: string;
  startTime: string | null;
  startsAt: Date;
  weekly: boolean;
  categories: string[];
  campuses: string[];
  host: { name: string; href: string | null };
};

/** Approved campus events plus church events the church tagged for students. */
export async function listCampusEvents(options: { campus?: string; category?: string; days?: number } = {}) {
  const prisma = await db();
  const from = chicagoDateOf(new Date());
  const to = addDays(from, options.days ?? 120);
  const inWindow = { OR: [{ startDate: { gte: from, lte: to } }, { recurrence: "WEEKLY" as const, startDate: { lte: to }, recurrenceUntil: { gte: from } }] };
  const category = options.category && EVENT_CATEGORY_KEYS.has(options.category) ? options.category : undefined;
  const campus = options.campus && CAMPUS_KEYS.has(options.campus) ? options.campus : undefined;

  const [campusEvents, churchEvents] = await Promise.all([
    prisma.campusEvent.findMany({
      where: { status: "APPROVED", ...inWindow, ...(category ? { categories: { has: category } } : {}), ...(campus ? { campuses: { has: campus } } : {}) },
      include: { organization: { select: { name: true, slug: true } }, church: { select: { name: true, slug: true } } },
      take: 300
    }),
    // Church events carry no campus; they apply to every campus filter.
    prisma.event.findMany({
      where: { status: "PUBLISHED", ...inWindow, NOT: { categories: { isEmpty: true } }, ...(category ? { categories: { has: category } } : {}), church: { status: "ACTIVE" } },
      include: { church: { select: { name: true, slug: true, city: true, complimentaryPremiumUntil: true, cityRecord: { select: { slug: true, name: true } }, subscription: { select: { status: true, currentPeriodEnd: true } } } } },
      take: 300
    })
  ]);

  const out: CampusOccurrence[] = [];
  for (const e of campusEvents) {
    const host = e.organization
      ? { name: e.organization.name, href: `/campus/organizations/${e.organization.slug}` }
      : e.church
        ? { name: e.church.name, href: `/churches/${e.church.slug}` }
        : { name: "Community event", href: null };
    for (const o of expandOccurrences(e, { slug: "", name: host.name, city: "", citySlug: "" }, from, to)) {
      out.push({ key: `c-${e.id}-${o.date}`, icsUrl: `/api/campus-events/${e.id}/ics`, title: e.title, description: e.description, location: e.location, registrationUrl: e.registrationUrl, date: o.date, startTime: e.startTime, startsAt: o.startsAt, weekly: e.recurrence === "WEEKLY", categories: e.categories, campuses: e.campuses, host });
    }
  }
  for (const e of churchEvents) {
    if (!computeEntitlement({ complimentaryPremiumUntil: e.church.complimentaryPremiumUntil, subscription: e.church.subscription }).active) continue;
    for (const o of expandOccurrences(e, { slug: e.church.slug, name: e.church.name, city: e.church.city, citySlug: e.church.cityRecord?.slug ?? "" }, from, to)) {
      out.push({ key: `e-${e.id}-${o.date}`, icsUrl: `/api/events/${e.id}/ics`, title: e.title, description: e.description, location: e.location, registrationUrl: e.registrationUrl, date: o.date, startTime: e.startTime, startsAt: o.startsAt, weekly: e.recurrence === "WEEKLY", categories: e.categories, campuses: [], host: { name: e.church.name, href: `/churches/${e.church.slug}` } });
    }
  }
  return out.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export async function getCampusEventForCalendar(id: string) {
  const prisma = await db();
  const e = await prisma.campusEvent.findUnique({ where: { id }, include: { organization: { select: { name: true, slug: true } } } });
  return e && e.status === "APPROVED" ? e : null;
}

// ---------------------------------------------------------------------------
// Student-Friendly Churches
// ---------------------------------------------------------------------------

export type StudentChurch = {
  church: ChurchRecord;
  /** Tags the church confirmed, or that staff recorded from a public source. */
  tags: string[];
  tagSource: "church" | "public-source" | null;
  /** Student-related ministries the church lists on its own profile. */
  studentMinistries: string[];
  milesFromUiuc: number | null;
  milesFromParkland: number | null;
};

export async function listStudentFriendlyChurches(options: { tag?: string; campus?: string } = {}): Promise<StudentChurch[]> {
  const prisma = await db();
  const rows = await prisma.church.findMany({ where: { status: "ACTIVE" }, include: churchInclude, orderBy: [{ featured: "desc" }, { name: "asc" }] });
  const out: StudentChurch[] = [];
  for (const row of rows) {
    const church = mapChurchRow(row);
    const tags = church.studentTags ?? [];
    const studentMinistries = church.ministries.filter((m) => STUDENT_MINISTRY_PATTERN.test(m));
    if (!tags.length && !studentMinistries.length) continue;
    if (options.tag && !tags.includes(options.tag)) continue;
    const at = church.latitude != null && church.longitude != null ? { lat: church.latitude, lng: church.longitude } : null;
    out.push({
      church,
      tags,
      tagSource: tags.length ? (church.studentTagsSource === "church" ? "church" : "public-source") : null,
      studentMinistries,
      milesFromUiuc: at ? milesBetween(at, CAMPUS_ANCHORS.uiuc) : null,
      milesFromParkland: at ? milesBetween(at, CAMPUS_ANCHORS.parkland) : null
    });
  }
  const key = options.campus === "parkland" ? "milesFromParkland" : "milesFromUiuc";
  return out.sort((a, b) => Number(b.tags.length > 0) - Number(a.tags.length > 0) || (a[key] ?? 99) - (b[key] ?? 99));
}

/** The directory's labeled Featured churches, for a clearly marked spotlight slot. */
export async function listFeaturedChurches(limit = 1) {
  const prisma = await db();
  const rows = await prisma.church.findMany({ where: { status: "ACTIVE", featured: true }, include: churchInclude, orderBy: { name: "asc" }, take: limit });
  return rows.map((row) => mapChurchRow(row));
}
