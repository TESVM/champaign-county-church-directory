import { EVENT_CATEGORY_KEYS } from "@/lib/campus";
import { StorageError, storeUploadedImage } from "@/lib/media";
import { z } from "zod";
import { type Actor, assertCanEditChurch, assertReviewer, canReview, isStaff } from "@/lib/actor";
import { db } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { audit } from "@/lib/services/audit";
import { notifyStaff } from "@/lib/services/email";
import { computeEntitlement } from "@/lib/services/entitlements";
import { siteUrl } from "@/lib/site";
import {
  addDays,
  chicagoDateOf,
  chicagoToUtc,
  isValidDateString,
  isValidTimeString
} from "@/lib/time/chicago";
import { LinkError, normalizeLink } from "@/lib/validation/links";

function fieldErrorsOf(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0] ?? "form")] ??= issue.message;
  return out;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : null));

const triState = z
  .enum(["yes", "no", ""])
  .optional()
  .transform((v) => (v === "yes" ? true : v === "no" ? false : null));

// ---------------------------------------------------------------------------
// Plan your first visit (free)
// ---------------------------------------------------------------------------

export const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "Korean",
  "Chinese (Mandarin)",
  "Chinese (Cantonese)",
  "French",
  "Swahili",
  "Arabic",
  "Hindi",
  "Telugu",
  "Tamil",
  "Vietnamese",
  "Portuguese",
  "Lingala",
  "American Sign Language"
] as const;

const guideSchema = z.object({
  parking: optionalText(800),
  entrance: optionalText(800),
  accessibility: optionalText(800),
  wheelchairAccessible: triState,
  hearingAssistance: triState,
  childrenCheckIn: optionalText(800),
  hasChildrenProgram: triState,
  serviceLength: optionalText(120),
  dress: optionalText(300),
  languages: z.array(z.enum(LANGUAGE_OPTIONS)).max(LANGUAGE_OPTIONS.length).default([]),
  whatToExpect: optionalText(2000)
});

export async function saveVisitorGuide(actor: Actor, churchId: string, input: Record<string, unknown>) {
  assertCanEditChurch(actor, churchId);
  const parsed = guideSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("Please fix the highlighted fields. Nothing was saved.", fieldErrorsOf(parsed.error));
  const prisma = await db();
  const data = { ...parsed.data, updatedBy: actor.email };
  await prisma.visitorGuide.upsert({ where: { churchId }, create: { churchId, ...data }, update: data });
  await prisma.church.update({ where: { id: churchId }, data: { lastUpdatedAt: new Date() } });
  await audit(actor, { action: "church.visitor_guide_updated", entityType: "VisitorGuide", entityId: churchId, churchId, summary: "Updated Plan Your First Visit" });
}

// ---------------------------------------------------------------------------
// Events (Enhanced profile)
// ---------------------------------------------------------------------------

async function churchIsEntitled(churchId: string) {
  const prisma = await db();
  const church = await prisma.church.findUnique({
    where: { id: churchId },
    select: { complimentaryPremiumUntil: true, subscription: { select: { status: true, currentPeriodEnd: true } } }
  });
  if (!church) throw new NotFoundError();
  return computeEntitlement({ complimentaryPremiumUntil: church.complimentaryPremiumUntil, subscription: church.subscription }).active;
}

const eventSchema = z
  .object({
    title: z.string().trim().min(3, "Give the event a title.").max(120),
    description: optionalText(3000),
    location: optionalText(200),
    startDate: z.string().refine(isValidDateString, "Choose a date."),
    startTime: z
      .string()
      .optional()
      .transform((v) => v || null)
      .refine((v) => v === null || isValidTimeString(v), "Use a time like 19:00."),
    endTime: z
      .string()
      .optional()
      .transform((v) => v || null)
      .refine((v) => v === null || isValidTimeString(v), "Use a time like 20:30."),
    recurrence: z.enum(["NONE", "WEEKLY"]).default("NONE"),
    recurrenceUntil: z
      .string()
      .optional()
      .transform((v) => v || null)
      .refine((v) => v === null || isValidDateString(v), "Choose an end date for the weekly series.")
  })
  .superRefine((value, ctx) => {
    if (value.endTime && !value.startTime) ctx.addIssue({ code: "custom", path: ["startTime"], message: "Add a start time, or clear the end time." });
    if (value.endTime && value.startTime && value.endTime <= value.startTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "The end time must be after the start time." });
    }
    if (value.recurrence === "WEEKLY") {
      if (!value.recurrenceUntil) ctx.addIssue({ code: "custom", path: ["recurrenceUntil"], message: "Choose when the weekly series ends." });
      else if (value.recurrenceUntil < value.startDate) ctx.addIssue({ code: "custom", path: ["recurrenceUntil"], message: "The series must end after it starts." });
      else if (value.recurrenceUntil > addDays(value.startDate, 366)) ctx.addIssue({ code: "custom", path: ["recurrenceUntil"], message: "Weekly series can run for up to one year." });
    }
    const today = chicagoDateOf(new Date());
    if (value.startDate < addDays(today, -1)) ctx.addIssue({ code: "custom", path: ["startDate"], message: "The event date is in the past." });
    if (value.startDate > addDays(today, 730)) ctx.addIssue({ code: "custom", path: ["startDate"], message: "Events can be scheduled up to two years ahead." });
  });

export async function saveEvent(actor: Actor, churchId: string, input: Record<string, unknown>, eventId?: string) {
  assertCanEditChurch(actor, churchId);
  if (!isStaff(actor) && !(await churchIsEntitled(churchId))) {
    throw new ForbiddenError("Publishing events is part of the Enhanced Church Profile.");
  }
  const parsed = eventSchema.safeParse(input);
  const fieldErrors = parsed.success ? {} : fieldErrorsOf(parsed.error);
  let registrationUrl: string | null = null;
  try {
    registrationUrl = normalizeLink(input.registrationUrl, "registration");
  } catch (error) {
    fieldErrors.registrationUrl = (error as LinkError).message;
  }
  // Optional flyer: an uploaded image, or a link to one.
  const flyerFile = input.flyerFile instanceof File && input.flyerFile.size > 0 ? input.flyerFile : null;
  let flyerLink: string | null = null;
  if (!flyerFile) {
    try {
      flyerLink = normalizeLink(input.flyerUrl, "image");
      if (flyerLink?.startsWith("http:")) fieldErrors.flyerUrl = "Flyer links must use https://.";
    } catch (error) {
      fieldErrors.flyerUrl = (error as LinkError).message;
    }
  }
  if (!parsed.success || Object.keys(fieldErrors).length) {
    throw new ValidationError("Please fix the highlighted fields. The event was not saved.", fieldErrors);
  }
  const data = parsed.data;
  const prisma = await db();
  let flyerUrl: string | null | undefined = flyerLink ?? (input.removeFlyer === "true" ? null : undefined);
  if (flyerFile) {
    const church = await prisma.church.findUniqueOrThrow({ where: { id: churchId }, select: { slug: true } });
    try {
      flyerUrl = await storeUploadedImage(flyerFile, `${church.slug}-event-flyer`);
    } catch (error) {
      if (error instanceof StorageError) throw new ValidationError(error.message, { flyerFile: error.message });
      throw error;
    }
  }
  const categories = (Array.isArray(input.categories) ? input.categories : input.categories ? [input.categories] : []).map(String).filter((c) => EVENT_CATEGORY_KEYS.has(c));
  const record = {
    ...data,
    categories,
    registrationUrl,
    // undefined keeps an existing flyer when editing; null removes it.
    ...(flyerUrl !== undefined ? { flyerUrl } : {}),
    recurrenceUntil: data.recurrence === "WEEKLY" ? data.recurrenceUntil : null,
    startsAt: chicagoToUtc(data.startDate, data.startTime ?? "00:00")
  };

  if (eventId) {
    const existing = await prisma.event.findUnique({ where: { id: eventId } });
    if (!existing || existing.churchId !== churchId) throw new NotFoundError("That event was not found.");
    await prisma.event.update({ where: { id: eventId }, data: record });
  } else {
    await prisma.event.create({ data: { ...record, churchId, createdBy: actor.email } });
  }
  await audit(actor, { action: eventId ? "event.updated" : "event.created", entityType: "Event", entityId: eventId ?? null, churchId, summary: `${eventId ? "Updated" : "Created"} event “${data.title}”` });
}

export async function cancelEvent(actor: Actor, eventId: string) {
  const prisma = await db();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new NotFoundError("That event was not found.");
  assertCanEditChurch(actor, event.churchId);
  await prisma.event.update({ where: { id: eventId }, data: { status: "CANCELLED" } });
  await audit(actor, { action: "event.cancelled", entityType: "Event", entityId: eventId, churchId: event.churchId, summary: `Cancelled event “${event.title}”` });
}

export type EventOccurrence = {
  eventId: string;
  title: string;
  description: string | null;
  location: string | null;
  registrationUrl: string | null;
  flyerUrl: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  startsAt: Date;
  recurrence: "NONE" | "WEEKLY";
  church: { slug: string; name: string; city: string; citySlug: string };
};

/** Expands one-off and weekly events into dated occurrences in [from, to] (Chicago dates). */
export function expandOccurrences(
  event: { id: string; title: string; description: string | null; location: string | null; registrationUrl: string | null; flyerUrl?: string | null; startDate: string; startTime: string | null; endTime: string | null; recurrence: "NONE" | "WEEKLY"; recurrenceUntil: string | null },
  church: EventOccurrence["church"],
  from: string,
  to: string
): EventOccurrence[] {
  const out: EventOccurrence[] = [];
  const make = (date: string): EventOccurrence => ({
    eventId: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    registrationUrl: event.registrationUrl,
    flyerUrl: event.flyerUrl ?? null,
    date,
    startTime: event.startTime,
    endTime: event.endTime,
    // Computed per date so 7:00 PM stays 7:00 PM across daylight-saving changes.
    startsAt: chicagoToUtc(date, event.startTime ?? "00:00"),
    recurrence: event.recurrence,
    church
  });

  if (event.recurrence === "NONE") {
    if (event.startDate >= from && event.startDate <= to) out.push(make(event.startDate));
    return out;
  }
  const until = event.recurrenceUntil && event.recurrenceUntil < to ? event.recurrenceUntil : to;
  let date = event.startDate;
  for (let i = 0; i < 60 && date <= until; i += 1) {
    if (date >= from) out.push(make(date));
    date = addDays(date, 7);
  }
  return out;
}

export async function listUpcomingEvents(options: { citySlug?: string; churchId?: string; days?: number } = {}) {
  const prisma = await db();
  const from = chicagoDateOf(new Date());
  const to = addDays(from, options.days ?? 90);
  const events = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      ...(options.churchId ? { churchId: options.churchId } : {}),
      church: { status: "ACTIVE", ...(options.citySlug ? { cityRecord: { slug: options.citySlug } } : {}) },
      OR: [{ startDate: { gte: from, lte: to } }, { recurrence: "WEEKLY", startDate: { lte: to }, recurrenceUntil: { gte: from } }]
    },
    include: {
      church: {
        select: {
          slug: true,
          name: true,
          city: true,
          complimentaryPremiumUntil: true,
          cityRecord: { select: { slug: true, name: true } },
          subscription: { select: { status: true, currentPeriodEnd: true } }
        }
      }
    },
    take: 500
  });

  return events
    // Events are an Enhanced Profile feature; a lapsed subscription hides them.
    .filter((e) => computeEntitlement({ complimentaryPremiumUntil: e.church.complimentaryPremiumUntil, subscription: e.church.subscription }).active)
    .flatMap((e) =>
      expandOccurrences(
        e,
        { slug: e.church.slug, name: e.church.name, city: e.church.cityRecord?.name ?? e.church.city, citySlug: e.church.cityRecord?.slug ?? "" },
        from,
        to
      )
    )
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export async function listChurchEventsForEditing(actor: Actor, churchId: string) {
  assertCanEditChurch(actor, churchId);
  const prisma = await db();
  return prisma.event.findMany({ where: { churchId }, orderBy: { startsAt: "desc" }, take: 100 });
}

export async function getEventForCalendar(eventId: string) {
  const prisma = await db();
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { church: { select: { slug: true, name: true, status: true, address1: true, city: true, state: true } } }
  });
  if (!event || event.status !== "PUBLISHED" || event.church.status !== "ACTIVE") return null;
  return event;
}

// ---------------------------------------------------------------------------
// Community resources (free, moderated)
// ---------------------------------------------------------------------------

export const RESOURCE_CATEGORIES = [
  { value: "FOOD_PANTRY", label: "Food pantry" },
  { value: "COMMUNITY_MEAL", label: "Community meal" },
  { value: "CLOTHING", label: "Clothing" },
  { value: "SUPPORT_GROUP", label: "Support group" },
  { value: "FINANCIAL_HELP", label: "Financial help" },
  { value: "TUTORING", label: "Tutoring and education" },
  { value: "HEALTH", label: "Health and wellness" },
  { value: "OTHER", label: "Other help" }
] as const;

type ResourceCategoryValue = (typeof RESOURCE_CATEGORIES)[number]["value"];

const resourceSchema = z.object({
  category: z.enum(RESOURCE_CATEGORIES.map((c) => c.value) as [ResourceCategoryValue, ...ResourceCategoryValue[]], {
    errorMap: () => ({ message: "Choose a category." })
  }),
  title: z.string().trim().min(3, "Give the program a name.").max(120),
  description: z.string().trim().min(10, "Describe the program in a sentence or two.").max(2000),
  schedule: optionalText(300),
  eligibility: optionalText(500),
  contact: optionalText(200)
});

export async function saveResource(actor: Actor, churchId: string, input: Record<string, unknown>, resourceId?: string) {
  assertCanEditChurch(actor, churchId);
  const parsed = resourceSchema.safeParse(input);
  const fieldErrors = parsed.success ? {} : fieldErrorsOf(parsed.error);
  let url: string | null = null;
  try {
    url = normalizeLink(input.url, "website");
  } catch (error) {
    fieldErrors.url = (error as LinkError).message;
  }
  if (!parsed.success || Object.keys(fieldErrors).length) {
    throw new ValidationError("Please fix the highlighted fields. Nothing was saved.", fieldErrors);
  }
  const prisma = await db();
  // Every new or edited resource goes back through review before it is public.
  const status = canReview(actor) ? "APPROVED" : "PENDING";
  const data = { ...parsed.data, url, status: status as "APPROVED" | "PENDING", reviewedAt: status === "APPROVED" ? new Date() : null, reviewedBy: status === "APPROVED" ? actor.email : null };

  let id = resourceId;
  if (resourceId) {
    const existing = await prisma.communityResource.findUnique({ where: { id: resourceId } });
    if (!existing || existing.churchId !== churchId) throw new NotFoundError("That resource was not found.");
    await prisma.communityResource.update({ where: { id: resourceId }, data });
  } else {
    id = (await prisma.communityResource.create({ data: { ...data, churchId, createdBy: actor.email } })).id;
  }
  await audit(actor, { action: resourceId ? "resource.updated" : "resource.created", entityType: "CommunityResource", entityId: id, churchId, summary: `${resourceId ? "Updated" : "Added"} community resource “${parsed.data.title}”` });
  if (status === "PENDING") {
    await notifyStaff(`Community resource to review: ${parsed.data.title}`, `${parsed.data.title}\n\n${parsed.data.description}\n\n${siteUrl()}/admin/resources`);
  }
  return { status };
}

export async function removeResource(actor: Actor, resourceId: string) {
  const prisma = await db();
  const resource = await prisma.communityResource.findUnique({ where: { id: resourceId } });
  if (!resource) throw new NotFoundError();
  assertCanEditChurch(actor, resource.churchId);
  await prisma.communityResource.delete({ where: { id: resourceId } });
  await audit(actor, { action: "resource.removed", entityType: "CommunityResource", entityId: resourceId, churchId: resource.churchId, summary: `Removed community resource “${resource.title}”` });
}

export async function moderateResource(actor: Actor, resourceId: string, decision: "APPROVED" | "REJECTED", note?: string) {
  assertReviewer(actor);
  if (decision === "REJECTED" && !note?.trim()) throw new ValidationError("Add a note for the church explaining why.", { note: "Required to reject." });
  const prisma = await db();
  const resource = await prisma.communityResource.update({
    where: { id: resourceId },
    data: { status: decision, reviewerNote: note || null, reviewedAt: new Date(), reviewedBy: actor.email }
  });
  await audit(actor, { action: `resource.${decision.toLowerCase()}`, entityType: "CommunityResource", entityId: resourceId, churchId: resource.churchId, summary: `${decision === "APPROVED" ? "Approved" : "Rejected"} “${resource.title}”` });
}

export async function listResources(options: { q?: string; category?: string; citySlug?: string; churchId?: string; status?: "APPROVED" | "PENDING" | "REJECTED" | "ALL" } = {}) {
  const prisma = await db();
  const status = options.status ?? "APPROVED";
  const category = RESOURCE_CATEGORIES.some((c) => c.value === options.category) ? (options.category as ResourceCategoryValue) : undefined;
  return prisma.communityResource.findMany({
    where: {
      ...(status === "ALL" ? {} : { status }),
      ...(category ? { category } : {}),
      ...(options.churchId ? { churchId: options.churchId } : {}),
      church: { status: "ACTIVE", ...(options.citySlug ? { cityRecord: { slug: options.citySlug } } : {}) },
      ...(options.q
        ? {
            OR: [
              { title: { contains: options.q, mode: "insensitive" } },
              { description: { contains: options.q, mode: "insensitive" } },
              { eligibility: { contains: options.q, mode: "insensitive" } },
              { church: { name: { contains: options.q, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    include: { church: { select: { slug: true, name: true, city: true, address1: true, phone: true } } },
    orderBy: [{ category: "asc" }, { title: "asc" }],
    take: 300
  });
}

// ---------------------------------------------------------------------------
// Activity counts
// ---------------------------------------------------------------------------

export const ACTIVITY_METRICS = {
  profile_view: "Profile views",
  directions_click: "Directions clicks",
  website_click: "Website clicks",
  phone_click: "Phone taps",
  email_click: "Email clicks",
  livestream_click: "Livestream clicks",
  app_click: "App store clicks",
  social_click: "Social media clicks",
  share: "Share-link copies"
} as const;

export type ActivityMetric = keyof typeof ACTIVITY_METRICS;

export function isActivityMetric(value: unknown): value is ActivityMetric {
  return typeof value === "string" && value in ACTIVITY_METRICS;
}

/** Increments a daily counter. No visitor identifier is stored with it. */
export async function recordActivity(churchSlug: string, metric: ActivityMetric) {
  const prisma = await db();
  const church = await prisma.church.findUnique({ where: { slug: churchSlug }, select: { id: true, status: true } });
  if (!church || church.status !== "ACTIVE") return false;
  const day = chicagoDateOf(new Date());
  await prisma.activityDaily.upsert({
    where: { churchId_day_metric: { churchId: church.id, day, metric } },
    create: { churchId: church.id, day, metric, count: 1 },
    update: { count: { increment: 1 } }
  });
  return true;
}

export async function getActivitySummary(churchId: string, days = 30) {
  const prisma = await db();
  const to = chicagoDateOf(new Date());
  const from = addDays(to, -(days - 1));
  const rows = await prisma.activityDaily.findMany({ where: { churchId, day: { gte: from, lte: to } }, orderBy: { day: "asc" } });
  const totals = Object.fromEntries(Object.keys(ACTIVITY_METRICS).map((k) => [k, 0])) as Record<ActivityMetric, number>;
  const byDay = new Map<string, number>();
  for (const row of rows) {
    if (isActivityMetric(row.metric)) totals[row.metric] += row.count;
    if (row.metric === "profile_view") byDay.set(row.day, (byDay.get(row.day) ?? 0) + row.count);
  }
  const series: Array<{ day: string; views: number }> = [];
  for (let d = from; d <= to; d = addDays(d, 1)) series.push({ day: d, views: byDay.get(d) ?? 0 });
  return { from, to, totals, series, hasData: rows.length > 0 };
}
