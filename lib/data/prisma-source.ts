import type {
  ChurchDetail,
  ChurchSummary,
  City,
  DayOfWeek,
  SocialPlatform
} from "@cccd/shared";
import { normalizeDayOfWeek, parseDisplayTime } from "@/lib/api/serializers";

/**
 * Maps Prisma rows onto the public `/api/v1` contract.
 *
 * Admin and church edits already write to Postgres, but every public page reads
 * `lib/data/mock.ts`, so a save is invisible on the site forever. This module is
 * the read half that closes that gap.
 *
 * The mapping functions are deliberately pure and take plain row shapes rather
 * than Prisma's generated types, so they can be unit tested without a database.
 * The query functions around them are intentionally thin.
 */

/** Relations `churchInclude` pulls in. Mirrors the Prisma model. */
export type ChurchRow = {
  id: string;
  slug: string;
  name: string;
  denomination: string | null;
  description: string | null;
  address1: string | null;
  address2: string | null;
  city: string;
  state: string;
  zip: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  appUrl: string | null;
  livestreamUrl: string | null;
  logoUrl: string | null;
  featuredImageUrl: string | null;
  featuredImageIsAi: boolean;
  latitude: number | null;
  longitude: number | null;
  verified: boolean;
  claimed: boolean;
  premiumProfile?: boolean;
  lastUpdatedAt: Date | null;
  updatedAt: Date;
  cityRecord: { slug: string; name: string } | null;
  seniorPastor: {
    fullName: string;
    title: string | null;
    bio: string | null;
    photoUrl: string | null;
  } | null;
  leaders: Array<{
    fullName: string;
    title: string | null;
    bio: string | null;
    photoUrl: string | null;
  }>;
  serviceTimes: Array<{
    id: string;
    serviceName: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string | null;
    notes: string | null;
  }>;
  ministries: Array<{ id: string; name: string; description: string | null }>;
  socialLinks: Array<{ platform: string; url: string }>;
};

export type CityRow = {
  id: string;
  slug: string;
  name: string;
  county: string;
  state: string;
};

const SOCIAL_PLATFORMS: readonly SocialPlatform[] = [
  "facebook",
  "instagram",
  "youtube",
  "x",
  "tiktok"
];

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toSocialPlatform(value: string): SocialPlatform | null {
  const lower = value.trim().toLowerCase();
  return (SOCIAL_PLATFORMS as readonly string[]).includes(lower)
    ? (lower as SocialPlatform)
    : null;
}

/** 24-hour "HH:MM" back to a human "9:00 AM" for the display string. */
function toDisplayTime(value: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return value;

  const hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function buildServiceSummary(row: ChurchRow): string | null {
  if (row.serviceTimes.length === 0) return null;

  return row.serviceTimes
    .slice(0, 3)
    .map((service) => {
      const day = normalizeDayOfWeek(service.dayOfWeek);
      const label = day.charAt(0) + day.slice(1).toLowerCase();
      return `${label} ${toDisplayTime(service.startTime)}`;
    })
    .join(" • ");
}

export function mapChurchRowToSummary(row: ChurchRow): ChurchSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    denomination: emptyToNull(row.denomination),
    // The database has no dedicated short description; derive one so list rows
    // are not blank, and keep it short enough for two lines on a phone.
    shortDescription: emptyToNull(row.description)?.slice(0, 160) ?? null,
    city: {
      // cityRecord is the relation and authoritative. The denormalised `city`
      // string can drift from it, which it already does on any city edit.
      slug: row.cityRecord?.slug ?? "",
      name: row.cityRecord?.name ?? row.city
    },
    address: {
      line1: emptyToNull(row.address1),
      line2: emptyToNull(row.address2),
      city: row.cityRecord?.name ?? row.city,
      state: row.state,
      zip: emptyToNull(row.zip),
      latitude: row.latitude,
      longitude: row.longitude
    },
    media: {
      logoUrl: emptyToNull(row.logoUrl),
      featuredImageUrl: emptyToNull(row.featuredImageUrl),
      featuredImageIsAi: Boolean(row.featuredImageIsAi && emptyToNull(row.featuredImageUrl))
    },
    seniorPastor: row.seniorPastor
      ? {
          fullName: row.seniorPastor.fullName,
          title: emptyToNull(row.seniorPastor.title),
          bio: emptyToNull(row.seniorPastor.bio),
          photoUrl: emptyToNull(row.seniorPastor.photoUrl)
        }
      : null,
    verified: row.verified,
    claimed: row.claimed,
    premiumProfile: Boolean(row.premiumProfile),
    hasWebsite: Boolean(emptyToNull(row.websiteUrl)),
    hasApp: Boolean(emptyToNull(row.appUrl)),
    hasLivestream: Boolean(emptyToNull(row.livestreamUrl)),
    serviceSummary: buildServiceSummary(row),
    lastUpdatedAt: (row.lastUpdatedAt ?? row.updatedAt).toISOString()
  };
}

export function mapChurchRowToDetail(row: ChurchRow): ChurchDetail {
  return {
    ...mapChurchRowToSummary(row),
    description: emptyToNull(row.description),
    contact: {
      phone: emptyToNull(row.phone),
      email: emptyToNull(row.email),
      websiteUrl: emptyToNull(row.websiteUrl),
      appUrl: emptyToNull(row.appUrl),
      appStoreUrl: null,
      googlePlayUrl: null,
      livestreamUrl: emptyToNull(row.livestreamUrl)
    },
    leaders: row.leaders.map((leader) => ({
      fullName: leader.fullName,
      title: emptyToNull(leader.title),
      bio: emptyToNull(leader.bio),
      photoUrl: emptyToNull(leader.photoUrl)
    })),
    serviceTimes: row.serviceTimes.map((service) => {
      const start = parseDisplayTime(service.startTime) ?? service.startTime;
      const end = service.endTime ? parseDisplayTime(service.endTime) : null;
      const displayStart = toDisplayTime(start);
      const displayEnd = end ? toDisplayTime(end) : null;

      return {
        id: service.id,
        serviceName: service.serviceName,
        dayOfWeek: normalizeDayOfWeek(service.dayOfWeek) as DayOfWeek,
        startTime: start,
        endTime: end,
        displayTime: displayEnd ? `${displayStart} - ${displayEnd}` : displayStart,
        notes: emptyToNull(service.notes)
      };
    }),
    ministries: row.ministries.map((ministry) => ({
      id: ministry.id,
      name: ministry.name,
      description: emptyToNull(ministry.description)
    })),
    socialLinks: row.socialLinks.flatMap((link) => {
      const platform = toSocialPlatform(link.platform);
      return platform ? [{ platform, url: link.url }] : [];
    })
  };
}

export function mapCityRow(row: CityRow, churchCount: number): City {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    county: row.county,
    state: row.state,
    // The City model has no description column; the static data supplies one.
    description: null,
    churchCount
  };
}

/** Relations every church read needs. Kept in one place so reads stay consistent. */
export const churchInclude = {
  cityRecord: { select: { slug: true, name: true } },
  seniorPastor: {
    select: { fullName: true, title: true, bio: true, photoUrl: true }
  },
  leaders: { select: { fullName: true, title: true, bio: true, photoUrl: true } },
  serviceTimes: {
    select: {
      id: true,
      serviceName: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      notes: true
    }
  },
  ministries: { select: { id: true, name: true, description: true } },
  socialLinks: { select: { platform: true, url: true } }
} as const;
