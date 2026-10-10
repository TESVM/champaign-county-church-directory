import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { type Actor, assertCanEditChurch, assertReviewer, membershipFor } from "@/lib/actor";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { audit } from "@/lib/services/audit";
import { computeEntitlement } from "@/lib/services/entitlements";
import { parseTimeToMinutes } from "@/lib/time/chicago";
import type { ChurchRecord, CityRecord, SocialPlatform } from "@/lib/types";
import { LinkError, normalizeLink, normalizePhone, SOCIAL_KINDS } from "@/lib/validation/links";

/**
 * The directory's single read/write path for church records.
 *
 * Public pages, the /api/v1 endpoints, church dashboards, admin screens, the
 * sitemap, and the CSV export all read through this module, so a saved change
 * appears everywhere at once.
 */

export const PAGE_SIZE = 12;
export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export const churchInclude = {
  cityRecord: { select: { slug: true, name: true } },
  seniorPastor: { select: { fullName: true, title: true, bio: true, photoUrl: true } },
  leaders: { select: { id: true, fullName: true, title: true, bio: true, photoUrl: true }, orderBy: { createdAt: "asc" } },
  serviceTimes: { orderBy: [{ startMinutes: "asc" }, { createdAt: "asc" }] },
  ministries: { select: { id: true, name: true, description: true }, orderBy: { createdAt: "asc" } },
  socialLinks: { select: { platform: true, url: true } },
  subscription: { select: { status: true, currentPeriodEnd: true } },
  visitorGuide: true
} satisfies Prisma.ChurchInclude;

export type ChurchRow = Prisma.ChurchGetPayload<{ include: typeof churchInclude }>;

const SOCIAL_SET = new Set<string>(SOCIAL_KINDS);
const DAY_ORDER = new Map<string, number>(DAYS.map((d, i) => [d.toLowerCase(), i]));

function opt<T>(value: T | null | undefined): T | undefined {
  return value === null || value === undefined || value === "" ? undefined : value;
}

export function mapChurchRow(row: ChurchRow, now = new Date()): ChurchRecord {
  const entitlement = computeEntitlement(
    { complimentaryPremiumUntil: row.complimentaryPremiumUntil, subscription: row.subscription },
    now
  );

  const services = [...row.serviceTimes].sort(
    (a, b) =>
      (DAY_ORDER.get(a.dayOfWeek.toLowerCase()) ?? 9) - (DAY_ORDER.get(b.dayOfWeek.toLowerCase()) ?? 9) ||
      (a.startMinutes ?? 9999) - (b.startMinutes ?? 9999)
  );

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    citySlug: row.cityRecord?.slug ?? "",
    city: row.cityRecord?.name ?? row.city,
    denomination: opt(row.denomination),
    description: row.description ?? "",
    shortDescription: (row.description ?? "").slice(0, 180),
    address1: row.address1 ?? "",
    address2: opt(row.address2),
    state: row.state,
    zip: row.zip ?? "",
    latitude: opt(row.latitude),
    longitude: opt(row.longitude),
    phone: opt(row.phone),
    email: opt(row.email),
    websiteUrl: opt(row.websiteUrl),
    appUrl: opt(row.appUrl),
    appStoreUrl: opt(row.appStoreUrl),
    googlePlayUrl: opt(row.googlePlayUrl),
    livestreamUrl: opt(row.livestreamUrl),
    logoUrl: opt(row.logoUrl),
    // AI-generated building images are never presented as the church's photo.
    featuredImageUrl: row.featuredImageIsAi ? undefined : opt(row.featuredImageUrl),
    featuredImageIsAi: row.featuredImageIsAi,
    featuredImageCredit: opt(row.featuredImageCredit),
    featuredImageSourceUrl: opt(row.featuredImageSourceUrl),
    verified: row.verified,
    claimed: row.claimed,
    premiumProfile: entitlement.active,
    enhancedProfile: entitlement.active,
    status: row.status,
    statusNote: opt(row.statusNote),
    publicSourceUrl: opt(row.publicSourceUrl),
    publicSourceCheckedAt: row.publicSourceCheckedAt?.toISOString(),
    leadershipConfirmedAt: row.leadershipConfirmedAt?.toISOString(),
    lastUpdatedAt: (row.lastUpdatedAt ?? row.updatedAt).toISOString(),
    lastScannedAt: (row.lastScannedAt ?? row.updatedAt).toISOString(),
    pastor: {
      fullName: row.seniorPastor?.fullName ?? "",
      title: row.seniorPastor?.title ?? "Pastor",
      bio: opt(row.seniorPastor?.bio),
      photoUrl: opt(row.seniorPastor?.photoUrl)
    },
    leadership: row.leaders
      .filter((leader) => leader.fullName !== row.seniorPastor?.fullName)
      .map((leader) => ({ fullName: leader.fullName, title: leader.title ?? "" })),
    serviceTimes: services.map((s) => ({
      serviceName: s.serviceName,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: opt(s.endTime),
      notes: opt(s.notes)
    })),
    serviceDetails: services.map((s) => ({
      id: s.id,
      serviceName: s.serviceName,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: opt(s.endTime),
      notes: opt(s.notes),
      language: opt(s.language),
      startMinutes: opt(s.startMinutes)
    })),
    ministries: row.ministries.map((m) => m.name),
    socialLinks: row.socialLinks
      .filter((link) => SOCIAL_SET.has(link.platform))
      .map((link) => ({ platform: link.platform as SocialPlatform, url: link.url })),
    visitorGuide: row.visitorGuide
      ? {
          parking: opt(row.visitorGuide.parking),
          entrance: opt(row.visitorGuide.entrance),
          accessibility: opt(row.visitorGuide.accessibility),
          wheelchairAccessible: row.visitorGuide.wheelchairAccessible,
          hearingAssistance: row.visitorGuide.hearingAssistance,
          childrenCheckIn: opt(row.visitorGuide.childrenCheckIn),
          hasChildrenProgram: row.visitorGuide.hasChildrenProgram,
          serviceLength: opt(row.visitorGuide.serviceLength),
          dress: opt(row.visitorGuide.dress),
          languages: row.visitorGuide.languages,
          whatToExpect: opt(row.visitorGuide.whatToExpect),
          updatedAt: row.visitorGuide.updatedAt.toISOString()
        }
      : null
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export type ChurchFilters = {
  q?: string;
  city?: string;
  denomination?: string;
  pastor?: string;
  ministry?: string;
  serviceDay?: string;
  timeOfDay?: "morning" | "afternoon" | "evening";
  language?: string;
  wheelchair?: boolean;
  children?: boolean;
  hasWebsite?: boolean;
  hasApp?: boolean;
  hasLivestream?: boolean;
  verified?: boolean;
  claimed?: boolean;
  slugs?: string[];
};

const TIME_WINDOWS = {
  morning: { gte: 0, lt: 12 * 60 },
  afternoon: { gte: 12 * 60, lt: 17 * 60 },
  evening: { gte: 17 * 60, lt: 24 * 60 }
} as const;

/** Reads filters from URL search params, ignoring anything unrecognised. */
export function parseChurchFilters(params: Record<string, string | string[] | undefined>): ChurchFilters {
  const get = (key: string) => {
    const value = params[key];
    const first = Array.isArray(value) ? value[0] : value;
    const trimmed = first?.trim();
    return trimmed ? trimmed.slice(0, 120) : undefined;
  };
  const flag = (key: string) => (get(key) === "true" ? true : undefined);
  const day = get("serviceDay");
  const time = get("timeOfDay");

  return {
    q: get("q"),
    city: get("city")?.toLowerCase(),
    denomination: get("denomination"),
    pastor: get("pastor"),
    ministry: get("ministry"),
    serviceDay: day ? DAYS.find((d) => d.toLowerCase() === day.toLowerCase()) : undefined,
    timeOfDay: time === "morning" || time === "afternoon" || time === "evening" ? time : undefined,
    language: get("language"),
    wheelchair: flag("wheelchair"),
    children: flag("children"),
    hasWebsite: flag("hasWebsite"),
    hasApp: flag("hasApp"),
    hasLivestream: flag("hasLivestream"),
    verified: flag("verified"),
    claimed: flag("claimed")
  };
}

export function buildChurchWhere(filters: ChurchFilters): Prisma.ChurchWhereInput {
  const and: Prisma.ChurchWhereInput[] = [{ status: "ACTIVE" }];
  const insensitive = "insensitive" as const;

  if (filters.q) {
    const q = filters.q;
    and.push({
      OR: [
        { name: { contains: q, mode: insensitive } },
        { slug: { contains: q.replace(/\s+/g, "-"), mode: insensitive } },
        { city: { contains: q, mode: insensitive } },
        { denomination: { contains: q, mode: insensitive } },
        { description: { contains: q, mode: insensitive } },
        { seniorPastor: { fullName: { contains: q, mode: insensitive } } },
        { ministries: { some: { name: { contains: q, mode: insensitive } } } }
      ]
    });
  }
  if (filters.city) and.push({ cityRecord: { slug: filters.city } });
  if (filters.denomination) and.push({ denomination: { contains: filters.denomination, mode: insensitive } });
  if (filters.pastor) and.push({ seniorPastor: { fullName: { contains: filters.pastor, mode: insensitive } } });
  if (filters.ministry) and.push({ ministries: { some: { name: { contains: filters.ministry, mode: insensitive } } } });

  if (filters.serviceDay || filters.timeOfDay) {
    // Day and time must match the same service, not two different ones.
    and.push({
      serviceTimes: {
        some: {
          ...(filters.serviceDay ? { dayOfWeek: { equals: filters.serviceDay, mode: insensitive } } : {}),
          ...(filters.timeOfDay ? { startMinutes: TIME_WINDOWS[filters.timeOfDay] } : {})
        }
      }
    });
  }

  if (filters.language) {
    and.push({
      OR: [
        { visitorGuide: { languages: { has: filters.language } } },
        { serviceTimes: { some: { language: { equals: filters.language, mode: insensitive } } } }
      ]
    });
  }
  if (filters.wheelchair) and.push({ visitorGuide: { wheelchairAccessible: true } });
  if (filters.children) and.push({ visitorGuide: { hasChildrenProgram: true } });
  if (filters.hasWebsite) and.push({ websiteUrl: { not: null } });
  if (filters.hasApp) and.push({ OR: [{ appUrl: { not: null } }, { appStoreUrl: { not: null } }, { googlePlayUrl: { not: null } }] });
  if (filters.hasLivestream) and.push({ livestreamUrl: { not: null } });
  if (filters.verified) and.push({ verified: true });
  if (filters.claimed) and.push({ claimed: true });
  if (filters.slugs) and.push({ slug: { in: filters.slugs.slice(0, 100) } });

  return { AND: and };
}

export async function listChurches(filters: ChurchFilters, page = 1, pageSize = PAGE_SIZE) {
  const prisma = await db();
  const where = buildChurchWhere(filters);
  const safePage = Math.max(1, Math.floor(page) || 1);

  const [rows, total] = await Promise.all([
    prisma.church.findMany({
      where,
      include: churchInclude,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: (safePage - 1) * pageSize,
      take: pageSize
    }),
    prisma.church.count({ where })
  ]);

  return {
    items: rows.map((row) => mapChurchRow(row)),
    total,
    page: safePage,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize))
  };
}

/** Public profile lookup. Returns hidden listings only when `includeHidden`. */
export async function getChurchBySlug(slug: string, options: { includeHidden?: boolean } = {}) {
  const prisma = await db();
  const row = await prisma.church.findUnique({ where: { slug }, include: churchInclude });
  if (!row) return null;
  if (row.status === "HIDDEN" && !options.includeHidden) return null;
  return { church: mapChurchRow(row), row };
}

export async function getChurchIdBySlug(slug: string) {
  const prisma = await db();
  const row = await prisma.church.findUnique({ where: { slug }, select: { id: true, name: true, slug: true, status: true } });
  return row;
}

export async function getMergeTarget(mergedIntoId: string | null) {
  if (!mergedIntoId) return null;
  const prisma = await db();
  return prisma.church.findUnique({ where: { id: mergedIntoId }, select: { slug: true, name: true } });
}

export type CityWithCount = CityRecord & { churchCount: number };

export async function listCities(options: { includeEmpty?: boolean } = {}): Promise<CityWithCount[]> {
  const prisma = await db();
  const rows = await prisma.city.findMany({
    include: { _count: { select: { churches: { where: { status: "ACTIVE" } } } } },
    orderBy: { name: "asc" }
  });
  return rows
    .map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      county: row.county,
      state: row.state,
      description: row.description ?? "",
      churchCount: row._count.churches
    }))
    .filter((city) => options.includeEmpty || city.churchCount > 0);
}

export async function getCity(slug: string) {
  const cities = await listCities({ includeEmpty: true });
  return cities.find((city) => city.slug === slug) ?? null;
}

export async function listDenominations() {
  const prisma = await db();
  const rows = await prisma.church.findMany({
    where: { status: "ACTIVE", denomination: { not: null } },
    select: { denomination: true },
    distinct: ["denomination"],
    orderBy: { denomination: "asc" }
  });
  return rows.map((r) => r.denomination!).filter(Boolean);
}

/** Non-English languages any church has listed, for the Find a Service filter. */
export async function listLanguages() {
  const prisma = await db();
  const [guides, services] = await Promise.all([
    prisma.visitorGuide.findMany({ where: { church: { status: "ACTIVE" } }, select: { languages: true } }),
    prisma.serviceTime.findMany({
      where: { language: { not: null }, church: { status: "ACTIVE" } },
      select: { language: true },
      distinct: ["language"]
    })
  ]);
  const set = new Set<string>();
  guides.forEach((g) => g.languages.forEach((l) => set.add(l)));
  services.forEach((s) => s.language && set.add(s.language));
  set.delete("English");
  return [...set].sort();
}

export async function getHomepageData() {
  const prisma = await db();
  const active = { status: "ACTIVE" as const };
  const [featuredRows, recentRows, totalChurches, cityRows, pinnedRow, weekRow] = await Promise.all([
    prisma.church.findMany({
      where: { ...active, verified: true, featuredImageUrl: { not: null }, featuredImageIsAi: false },
      include: churchInclude,
      orderBy: [{ lastUpdatedAt: "desc" }],
      take: 3
    }),
    prisma.church.findMany({ where: active, include: churchInclude, orderBy: [{ lastUpdatedAt: "desc" }], take: 4 }),
    prisma.church.count({ where: active }),
    listCities(),
    prisma.church.findFirst({ where: { ...active, slug: "sheriff-temple-aoh-church-of-god" }, include: churchInclude }),
    prisma.church.findFirst({ where: { ...active, slug: "bethel-ame-church-champaign" }, include: churchInclude })
  ]);

  return {
    featured: featuredRows.map((r) => mapChurchRow(r)),
    recentlyUpdated: recentRows.map((r) => mapChurchRow(r)),
    totalChurches,
    cities: cityRows,
    pinned: pinnedRow ? mapChurchRow(pinnedRow) : null,
    churchOfTheWeek: weekRow ? mapChurchRow(weekRow) : featuredRows[0] ? mapChurchRow(featuredRows[0]) : null
  };
}

export async function listAllChurchSlugs() {
  const prisma = await db();
  return prisma.church.findMany({
    where: { status: { in: ["ACTIVE", "CLOSED"] } },
    select: { slug: true, status: true, lastUpdatedAt: true, updatedAt: true },
    orderBy: { slug: "asc" }
  });
}

/** Admin list with every status. */
export async function listChurchesForAdmin(options: { q?: string; status?: string; page?: number }) {
  const prisma = await db();
  const page = Math.max(1, options.page ?? 1);
  const where: Prisma.ChurchWhereInput = {
    ...(options.status && ["ACTIVE", "CLOSED", "MERGED", "HIDDEN"].includes(options.status)
      ? { status: options.status as "ACTIVE" }
      : {}),
    ...(options.q
      ? {
          OR: [
            { name: { contains: options.q, mode: "insensitive" } },
            { city: { contains: options.q, mode: "insensitive" } },
            { slug: { contains: options.q, mode: "insensitive" } }
          ]
        }
      : {})
  };
  const [rows, total] = await Promise.all([
    prisma.church.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        city: true,
        status: true,
        verified: true,
        claimed: true,
        publicSourceCheckedAt: true,
        leadershipConfirmedAt: true,
        lastUpdatedAt: true,
        featuredImageUrl: true,
        featuredImageIsAi: true
      },
      orderBy: [{ name: "asc" }],
      skip: (page - 1) * 50,
      take: 50
    }),
    prisma.church.count({ where })
  ]);
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / 50)) };
}

// ---------------------------------------------------------------------------
// Verification wording
// ---------------------------------------------------------------------------

export type VerificationStatus =
  | { level: "leadership"; label: string; date: string }
  | { level: "public-source"; label: string; date: string; sourceUrl?: string }
  | { level: "unverified"; label: string };

export function verificationStatus(church: Pick<ChurchRecord, "leadershipConfirmedAt" | "publicSourceCheckedAt" | "publicSourceUrl">): VerificationStatus {
  if (church.leadershipConfirmedAt) {
    return { level: "leadership", label: "Confirmed by church leadership", date: church.leadershipConfirmedAt };
  }
  if (church.publicSourceCheckedAt) {
    return {
      level: "public-source",
      label: "Checked against a public source",
      date: church.publicSourceCheckedAt,
      sourceUrl: church.publicSourceUrl
    };
  }
  return { level: "unverified", label: "Not yet verified" };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

const text = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));

const serviceInput = z.object({
  serviceName: z.string().trim().min(1, "Give each service a name.").max(80),
  dayOfWeek: z.enum(DAYS, { errorMap: () => ({ message: "Choose a day for each service." }) }),
  startTime: z.string().trim().min(1, "Give each service a start time.").max(20),
  endTime: z.string().trim().max(20).optional(),
  language: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(200).optional()
});

const leaderInput = z.object({
  fullName: z.string().trim().min(2).max(120),
  title: z.string().trim().max(80).optional()
});

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter the church name.").max(140),
  denomination: text(80),
  description: text(4000),
  address1: text(160),
  address2: text(160),
  citySlug: z.string().trim().min(1, "Choose a city."),
  zip: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || /^\d{5}(-\d{4})?$/.test(v), "Enter a 5-digit ZIP code."),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => v?.toLowerCase() || null)
    .refine((v) => v === null || z.string().email().safeParse(v).success, "Enter a valid public email address."),
  pastorName: text(120),
  pastorTitle: text(80),
  ministries: z.array(z.string().trim().min(1).max(80)).max(40),
  leaders: z.array(leaderInput).max(30),
  services: z.array(serviceInput).max(30)
});

export type ChurchProfileInput = {
  name?: unknown;
  denomination?: unknown;
  description?: unknown;
  address1?: unknown;
  address2?: unknown;
  citySlug?: unknown;
  zip?: unknown;
  phone?: unknown;
  email?: unknown;
  websiteUrl?: unknown;
  appUrl?: unknown;
  appStoreUrl?: unknown;
  googlePlayUrl?: unknown;
  livestreamUrl?: unknown;
  facebookUrl?: unknown;
  instagramUrl?: unknown;
  youtubeUrl?: unknown;
  xUrl?: unknown;
  tiktokUrl?: unknown;
  pastorName?: unknown;
  pastorTitle?: unknown;
  ministries?: unknown;
  leaders?: unknown;
  services?: unknown;
};

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value.split("\n").map((line) => line.trim()).filter(Boolean);
    }
  }
  return [];
}

export function parseProfileInput(input: ChurchProfileInput) {
  const fieldErrors: Record<string, string> = {};

  const parsed = profileSchema.safeParse({
    name: input.name ?? "",
    denomination: input.denomination ?? undefined,
    description: input.description ?? undefined,
    address1: input.address1 ?? undefined,
    address2: input.address2 ?? undefined,
    citySlug: input.citySlug ?? "",
    zip: input.zip ?? undefined,
    email: input.email ?? undefined,
    pastorName: input.pastorName ?? undefined,
    pastorTitle: input.pastorTitle ?? undefined,
    ministries: [...new Set(asArray(input.ministries).map(String).map((s) => s.trim()).filter(Boolean))],
    leaders: asArray(input.leaders).filter((l) => l && typeof l === "object" && (l as { fullName?: string }).fullName),
    services: asArray(input.services).filter((s) => s && typeof s === "object")
  });

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
  }

  const link = (key: keyof ChurchProfileInput, kind: Parameters<typeof normalizeLink>[1]) => {
    try {
      return normalizeLink(input[key], kind);
    } catch (error) {
      fieldErrors[key] = error instanceof LinkError ? error.message : "Invalid link.";
      return null;
    }
  };

  const links = {
    websiteUrl: link("websiteUrl", "website"),
    appUrl: link("appUrl", "website"),
    appStoreUrl: link("appStoreUrl", "appStore"),
    googlePlayUrl: link("googlePlayUrl", "googlePlay"),
    livestreamUrl: link("livestreamUrl", "livestream"),
    social: {
      facebook: link("facebookUrl", "facebook"),
      instagram: link("instagramUrl", "instagram"),
      youtube: link("youtubeUrl", "youtube"),
      x: link("xUrl", "x"),
      tiktok: link("tiktokUrl", "tiktok")
    }
  };

  let phone: string | null = null;
  try {
    phone = normalizePhone(input.phone);
  } catch (error) {
    fieldErrors.phone = error instanceof LinkError ? error.message : "Invalid phone number.";
  }

  const services =
    parsed.success
      ? parsed.data.services.map((service, index) => {
          const minutes = parseTimeToMinutes(service.startTime);
          if (minutes === null) fieldErrors.services ??= `Service ${index + 1}: use a time like 10:30 AM.`;
          const endMinutes = service.endTime ? parseTimeToMinutes(service.endTime) : null;
          if (service.endTime && endMinutes === null) fieldErrors.services ??= `Service ${index + 1}: use an end time like 12:00 PM.`;
          return { ...service, startMinutes: minutes };
        })
      : [];

  if (Object.keys(fieldErrors).length > 0 || !parsed.success) {
    throw new ValidationError("Please fix the highlighted fields. Nothing was saved.", fieldErrors);
  }

  return { ...parsed.data, ...links, phone, services };
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/**
 * Saves a church's public listing. Owners, editors, reviewers and admins only.
 * An edit by the church's own leadership marks the listing confirmed by leadership.
 */
export async function updateChurchProfile(actor: Actor, churchId: string, input: ChurchProfileInput) {
  assertCanEditChurch(actor, churchId);
  const data = parseProfileInput(input);
  const prisma = await db();

  const existing = await prisma.church.findUnique({ where: { id: churchId }, include: churchInclude });
  if (!existing) throw new NotFoundError("That church no longer exists.");

  const city = await prisma.city.findUnique({ where: { slug: data.citySlug } });
  if (!city) throw new ValidationError("Choose a city from the list.", { citySlug: "Choose a city from the list." });

  const byLeadership = Boolean(membershipFor(actor, churchId));
  const now = new Date();

  const scalar = {
    name: data.name,
    denomination: data.denomination,
    description: data.description,
    address1: data.address1,
    address2: data.address2,
    zip: data.zip,
    phone: data.phone,
    email: data.email,
    websiteUrl: data.websiteUrl,
    appUrl: data.appUrl,
    appStoreUrl: data.appStoreUrl,
    googlePlayUrl: data.googlePlayUrl,
    livestreamUrl: data.livestreamUrl
  };

  const changed: Record<string, [unknown, unknown]> = {};
  for (const [key, value] of Object.entries(scalar)) {
    const before = (existing as unknown as Record<string, unknown>)[key] ?? null;
    if (before !== value) changed[key] = [before, value];
  }
  if (existing.cityId !== city.id) changed.city = [existing.city, city.name];

  // Lists are compared as normalised text so reordering-free edits register.
  const listDiff = (key: string, before: string[], after: string[]) => {
    if (JSON.stringify(before) !== JSON.stringify(after)) changed[key] = [before, after];
  };
  listDiff(
    "services",
    existing.serviceTimes.map((s) => `${s.dayOfWeek}|${s.startMinutes ?? s.startTime}|${s.serviceName}|${s.endTime ?? ""}|${s.language ?? ""}|${s.notes ?? ""}`).sort(),
    data.services.map((s) => `${s.dayOfWeek}|${s.startMinutes ?? s.startTime}|${s.serviceName}|${s.endTime ? formatMinutes(parseTimeToMinutes(s.endTime)!) : ""}|${s.language ?? ""}|${s.notes ?? ""}`).sort()
  );
  listDiff("ministries", existing.ministries.map((m) => m.name).sort(), [...data.ministries].sort());
  listDiff(
    "leaders",
    existing.leaders.filter((l) => l.fullName !== existing.seniorPastor?.fullName).map((l) => `${l.fullName}|${l.title ?? ""}`).sort(),
    data.leaders.map((l) => `${l.fullName}|${l.title ?? ""}`).sort()
  );
  listDiff(
    "socialLinks",
    existing.socialLinks.map((l) => `${l.platform}|${l.url}`).sort(),
    Object.entries(data.social).filter(([, url]) => url).map(([platform, url]) => `${platform}|${url}`).sort()
  );
  const addressMoved = Boolean(changed.address1 || changed.city || changed.zip);

  await prisma.$transaction(async (tx) => {
    let seniorPastorId = existing.seniorPastorId;
    if (data.pastorName) {
      if (seniorPastorId) {
        await tx.pastor.update({
          where: { id: seniorPastorId },
          data: { fullName: data.pastorName, title: data.pastorTitle ?? "Pastor" }
        });
      } else {
        const pastor = await tx.pastor.create({
          data: { fullName: data.pastorName, title: data.pastorTitle ?? "Pastor" }
        });
        seniorPastorId = pastor.id;
      }
      if (existing.seniorPastor?.fullName !== data.pastorName) {
        changed.pastor = [existing.seniorPastor?.fullName ?? null, data.pastorName];
      }
    }

    await tx.church.update({
      where: { id: churchId },
      data: {
        ...scalar,
        cityId: city.id,
        city: city.name,
        seniorPastorId,
        lastUpdatedAt: now,
        ...(addressMoved ? { latitude: null, longitude: null, geocodedAt: null } : {}),
        ...(byLeadership
          ? { leadershipConfirmedAt: now, leadershipConfirmedBy: actor.email, verified: true }
          : {})
      }
    });

    await tx.serviceTime.deleteMany({ where: { churchId } });
    if (data.services.length) {
      await tx.serviceTime.createMany({
        data: data.services.map((s) => ({
          churchId,
          serviceName: s.serviceName,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startMinutes !== null ? formatMinutes(s.startMinutes) : s.startTime,
          endTime: s.endTime ? formatMinutes(parseTimeToMinutes(s.endTime)!) : null,
          startMinutes: s.startMinutes,
          language: s.language || null,
          notes: s.notes || null
        }))
      });
    }

    await tx.ministry.deleteMany({ where: { churchId } });
    if (data.ministries.length) {
      await tx.ministry.createMany({ data: data.ministries.map((name) => ({ churchId, name })) });
    }

    await tx.pastor.deleteMany({ where: { churchId, NOT: { id: seniorPastorId ?? "" } } });
    if (data.leaders.length) {
      await tx.pastor.createMany({
        data: data.leaders.map((l) => ({ churchId, fullName: l.fullName, title: l.title || null }))
      });
    }

    await tx.socialLink.deleteMany({ where: { churchId } });
    const social = Object.entries(data.social).filter(([, url]) => url) as Array<[string, string]>;
    if (social.length) {
      await tx.socialLink.createMany({ data: social.map(([platform, url]) => ({ churchId, platform, url })) });
    }

    await audit(
      actor,
      {
        action: "church.profile_updated",
        entityType: "Church",
        entityId: churchId,
        churchId,
        summary: `Updated listing for ${data.name}${byLeadership ? " (church leadership)" : ""}`,
        details: { changed: JSON.parse(JSON.stringify(changed)) }
      },
      tx
    );
  }, { timeout: 20_000, maxWait: 10_000 });

  return { slug: existing.slug, changedFields: Object.keys(changed) };
}

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "CLOSED", "MERGED", "HIDDEN"]),
  note: z.string().trim().max(500).optional(),
  mergeIntoSlug: z.string().trim().optional()
});

/** Closures, duplicates (merge), hiding and restoring. Reviewers and admins only. */
export async function setChurchStatus(actor: Actor, churchId: string, input: unknown) {
  assertReviewer(actor);
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("Choose a valid status.");
  const prisma = await db();
  const church = await prisma.church.findUnique({ where: { id: churchId } });
  if (!church) throw new NotFoundError();

  let mergedIntoId: string | null = null;
  if (parsed.data.status === "MERGED") {
    const target = parsed.data.mergeIntoSlug
      ? await prisma.church.findUnique({ where: { slug: parsed.data.mergeIntoSlug } })
      : null;
    if (!target || target.id === churchId) {
      throw new ValidationError("Enter the slug of the listing this one duplicates.", {
        mergeIntoSlug: "Enter the slug of the listing to keep."
      });
    }
    mergedIntoId = target.id;
  }

  await prisma.church.update({
    where: { id: churchId },
    data: { status: parsed.data.status, statusNote: parsed.data.note || null, mergedIntoId, lastUpdatedAt: new Date() }
  });
  await audit(actor, {
    action: "church.status_changed",
    entityType: "Church",
    entityId: churchId,
    churchId,
    summary: `Status ${church.status} → ${parsed.data.status}${parsed.data.note ? `: ${parsed.data.note}` : ""}`
  });
}

/** Records that a reviewer checked the listing against a public source today. */
export async function markPublicSourceChecked(actor: Actor, churchId: string, sourceUrl: unknown) {
  assertReviewer(actor);
  let url: string | null;
  try {
    url = normalizeLink(sourceUrl, "website");
  } catch (error) {
    throw new ValidationError("Enter the source you checked.", { sourceUrl: (error as Error).message });
  }
  if (!url) throw new ValidationError("Enter the source you checked.", { sourceUrl: "Enter the page you checked." });
  const prisma = await db();
  await prisma.church.update({
    where: { id: churchId },
    data: { publicSourceUrl: url, publicSourceCheckedAt: new Date(), verified: true }
  });
  await audit(actor, {
    action: "church.public_source_checked",
    entityType: "Church",
    entityId: churchId,
    churchId,
    summary: `Checked listing against ${url}`
  });
}

/** Normalised name for duplicate detection. */
export function normalizeChurchName(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(the|of|church|inc|a|an)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function findPossibleDuplicates(name: string, cityName?: string | null, address?: string | null) {
  const prisma = await db();
  const target = normalizeChurchName(name);
  const firstWord = target.split(" ")[0] ?? "";
  const candidates = await prisma.church.findMany({
    where: {
      OR: [
        ...(firstWord.length >= 3 ? [{ name: { contains: firstWord, mode: "insensitive" as const } }] : []),
        ...(address ? [{ address1: { contains: address.split(" ").slice(0, 2).join(" "), mode: "insensitive" as const } }] : [])
      ]
    },
    select: { id: true, slug: true, name: true, city: true, address1: true, status: true },
    take: 50
  });
  return candidates.filter((c) => {
    const n = normalizeChurchName(c.name);
    const sameName = n === target || (n.length > 4 && (n.includes(target) || target.includes(n)));
    const sameCity = !cityName || c.city.toLowerCase() === cityName.toLowerCase();
    const sameAddress = Boolean(address && c.address1 && c.address1.toLowerCase() === address.toLowerCase());
    return (sameName && sameCity) || sameAddress;
  });
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function uniqueSlug(base: string) {
  const prisma = await db();
  const root = slugify(base) || "church";
  for (let i = 0; i < 50; i += 1) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const exists = await prisma.church.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  throw new ValidationError("Could not create a unique address for this church.");
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export type ContactExportRow = {
  name: string;
  pastor: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
  status: string;
  verification: string;
  verificationDate: string;
  sourceUrl: string;
  profileUrl: string;
};

export async function exportContactRows(baseUrl: string): Promise<ContactExportRow[]> {
  const prisma = await db();
  const rows = await prisma.church.findMany({
    where: { status: { in: ["ACTIVE", "CLOSED"] } },
    include: { seniorPastor: { select: { fullName: true } }, cityRecord: { select: { name: true } } },
    orderBy: [{ city: "asc" }, { name: "asc" }]
  });
  return rows.map((row) => {
    const status = verificationStatus({
      leadershipConfirmedAt: row.leadershipConfirmedAt?.toISOString(),
      publicSourceCheckedAt: row.publicSourceCheckedAt?.toISOString(),
      publicSourceUrl: row.publicSourceUrl ?? undefined
    });
    return {
      name: row.name,
      pastor: row.seniorPastor?.fullName && !/not publicly listed/i.test(row.seniorPastor.fullName) ? row.seniorPastor.fullName : "",
      address: [row.address1, row.address2].filter(Boolean).join(", "),
      city: row.cityRecord?.name ?? row.city,
      state: row.state,
      zip: row.zip ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      website: row.websiteUrl ?? "",
      status: row.status,
      verification: status.label,
      verificationDate: "date" in status ? status.date.slice(0, 10) : "",
      sourceUrl: row.publicSourceUrl ?? "",
      profileUrl: `${baseUrl}/churches/${row.slug}`
    };
  });
}

/** Name/city options for pickers (claim form, admin merge). */
export async function listChurchOptions() {
  const prisma = await db();
  return prisma.church.findMany({
    where: { status: "ACTIVE" },
    select: { slug: true, name: true, city: true },
    orderBy: [{ name: "asc" }]
  });
}
