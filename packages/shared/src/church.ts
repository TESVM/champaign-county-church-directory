import { z } from "zod";

/**
 * Public church representation returned by `/api/v1`.
 *
 * The shape is derived from `prisma/schema.prisma`, not from the current
 * in-repo mock data. The API is backed by mock records today and by Prisma
 * after the data migration; because both sides serialise to this contract, the
 * mobile client does not change when the backing store does.
 *
 * Deliberate differences from the internal `ChurchRecord` type:
 *  - address fields are grouped rather than flattened
 *  - `city` is an object, mirroring the `City` relation, so clients can link to
 *    a city page without string-matching a display name
 *  - optional fields are `null` rather than absent, so JSON round-trips are
 *    stable and clients need only one emptiness check
 */

export const socialPlatformSchema = z.enum([
  "facebook",
  "instagram",
  "youtube",
  "x",
  "tiktok"
]);

export type SocialPlatform = z.infer<typeof socialPlatformSchema>;

/**
 * Days are an enum rather than free text. The database column is currently a
 * string, so the API normalises on the way out; that keeps clients from having
 * to case-fold and lets a later migration tighten the column without a
 * client-visible change.
 */
export const dayOfWeekSchema = z.enum([
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY"
]);

export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;

export const churchAddressSchema = z.object({
  line1: z.string().nullable(),
  line2: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  zip: z.string().nullable(),
  /** Present only once geocoding lands; clients must handle null. */
  latitude: z.number().nullable(),
  longitude: z.number().nullable()
});

export const churchCityRefSchema = z.object({
  slug: z.string(),
  name: z.string()
});

export const churchContactSchema = z.object({
  phone: z.string().nullable(),
  email: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  appUrl: z.string().nullable(),
  livestreamUrl: z.string().nullable()
});

export const churchMediaSchema = z.object({
  logoUrl: z.string().nullable(),
  featuredImageUrl: z.string().nullable(),
  /**
   * True when featuredImageUrl is AI-generated rather than a real photo.
   * Clients must label such images; they depict an invented building, not
   * this congregation's. Defaults to false so older responses still parse.
   */
  featuredImageIsAi: z.boolean().default(false)
});

export const pastorSchema = z.object({
  fullName: z.string(),
  title: z.string().nullable(),
  bio: z.string().nullable(),
  photoUrl: z.string().nullable()
});

export const serviceTimeSchema = z.object({
  id: z.string(),
  serviceName: z.string(),
  dayOfWeek: dayOfWeekSchema,
  /** 24-hour "HH:MM" in the church's local time (America/Chicago). */
  startTime: z.string(),
  endTime: z.string().nullable(),
  /** Original human-authored text, for display when parsing was lossy. */
  displayTime: z.string(),
  notes: z.string().nullable()
});

export const ministrySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable()
});

export const socialLinkSchema = z.object({
  platform: socialPlatformSchema,
  url: z.string()
});

/** Trimmed record used in lists, search results, and map pins. */
export const churchSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  denomination: z.string().nullable(),
  shortDescription: z.string().nullable(),
  city: churchCityRefSchema,
  address: churchAddressSchema,
  media: churchMediaSchema,
  seniorPastor: pastorSchema.nullable(),
  verified: z.boolean(),
  claimed: z.boolean(),
  hasWebsite: z.boolean(),
  hasApp: z.boolean(),
  hasLivestream: z.boolean(),
  /** Compact "Sunday 9:00 AM - 10:15 AM" style summary for list rows. */
  serviceSummary: z.string().nullable(),
  lastUpdatedAt: z.string().nullable()
});

export type ChurchSummary = z.infer<typeof churchSummarySchema>;

/** Full record for the church detail screen. */
export const churchDetailSchema = churchSummarySchema.extend({
  description: z.string().nullable(),
  contact: churchContactSchema,
  leaders: z.array(pastorSchema),
  serviceTimes: z.array(serviceTimeSchema),
  ministries: z.array(ministrySchema),
  socialLinks: z.array(socialLinkSchema)
});

export type ChurchDetail = z.infer<typeof churchDetailSchema>;

export const citySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  county: z.string(),
  state: z.string(),
  description: z.string().nullable(),
  churchCount: z.number().int().nonnegative()
});

export type City = z.infer<typeof citySchema>;
