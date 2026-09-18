import type {
  ChurchDetail,
  ChurchSummary,
  City,
  DayOfWeek,
  SocialPlatform
} from "@cccd/shared";
import type { ChurchRecord, CityRecord } from "@/lib/types";

/**
 * Maps internal records onto the public `/api/v1` contract.
 *
 * This is the seam that lets the API be backed by `lib/data/mock.ts` today and
 * by Prisma after the migration without the contract changing. When the Prisma
 * read path lands, a sibling module maps Prisma rows to the same output types
 * and the route handlers swap their source; clients see no difference.
 */

const DAY_LOOKUP: Record<string, DayOfWeek> = {
  sunday: "SUNDAY",
  monday: "MONDAY",
  tuesday: "TUESDAY",
  wednesday: "WEDNESDAY",
  thursday: "THURSDAY",
  friday: "FRIDAY",
  saturday: "SATURDAY"
};

const SOCIAL_PLATFORMS: readonly SocialPlatform[] = [
  "facebook",
  "instagram",
  "youtube",
  "x",
  "tiktok"
];

/** Service days are free text in the database; normalise, defaulting to Sunday. */
export function normalizeDayOfWeek(value: string): DayOfWeek {
  return DAY_LOOKUP[value.trim().toLowerCase()] ?? "SUNDAY";
}

/**
 * Parses human-authored times such as "9:00 AM" or "6:30 PM" into 24-hour
 * "HH:MM" so clients can sort and compare them. Returns null when the value
 * cannot be parsed, in which case callers fall back to the display string.
 */
export function parseDisplayTime(value: string): string | null {
  const match = /^\s*(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]\.?\s*$/.exec(value);

  if (match) {
    const rawHour = Number(match[1]);
    const minute = Number(match[2] ?? "0");
    const isPm = match[3].toLowerCase() === "p";

    if (rawHour < 1 || rawHour > 12 || minute > 59) return null;

    // 12 AM is 00:00 and 12 PM is 12:00, so the modulo must come before the shift.
    const hour = (rawHour % 12) + (isPm ? 12 : 0);
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  // Already 24-hour.
  const iso = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(value);
  if (iso) {
    const hour = Number(iso[1]);
    const minute = Number(iso[2]);
    if (hour > 23 || minute > 59) return null;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  return null;
}

function toSocialPlatform(value: string): SocialPlatform | null {
  const lower = value.trim().toLowerCase();
  return (SOCIAL_PLATFORMS as readonly string[]).includes(lower)
    ? (lower as SocialPlatform)
    : null;
}

function emptyToNull(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildServiceSummary(church: ChurchRecord): string | null {
  if (!church.serviceTimes.length) return null;

  return church.serviceTimes
    .slice(0, 3)
    .map((service) => `${service.dayOfWeek} ${service.startTime}`)
    .join(" • ");
}

export function toChurchSummary(church: ChurchRecord): ChurchSummary {
  return {
    id: church.id,
    slug: church.slug,
    name: church.name,
    denomination: emptyToNull(church.denomination),
    shortDescription: emptyToNull(church.shortDescription),
    city: {
      slug: church.citySlug,
      name: church.city
    },
    address: {
      line1: emptyToNull(church.address1),
      line2: null,
      city: church.city,
      state: church.state,
      zip: emptyToNull(church.zip),
      // Two addresses could not be matched by the Census geocoder; those stay
      // null and sort after located churches rather than being given a guessed
      // position, which would send someone to the wrong building.
      latitude: church.latitude ?? null,
      longitude: church.longitude ?? null
    },
    media: {
      logoUrl: emptyToNull(church.logoUrl),
      featuredImageUrl: emptyToNull(church.featuredImageUrl),
      // The bundled records carry only real photos or none.
      featuredImageIsAi: false
    },
    seniorPastor: church.pastor
      ? {
          fullName: church.pastor.fullName,
          title: emptyToNull(church.pastor.title),
          bio: emptyToNull(church.pastor.bio),
          photoUrl: null
        }
      : null,
    verified: church.verified,
    claimed: church.claimed,
    hasWebsite: Boolean(emptyToNull(church.websiteUrl)),
    hasApp: Boolean(emptyToNull(church.appUrl)),
    hasLivestream: Boolean(emptyToNull(church.livestreamUrl)),
    serviceSummary: buildServiceSummary(church),
    lastUpdatedAt: emptyToNull(church.lastUpdatedAt)
  };
}

export function toChurchDetail(church: ChurchRecord): ChurchDetail {
  return {
    ...toChurchSummary(church),
    description: emptyToNull(church.description),
    contact: {
      phone: emptyToNull(church.phone),
      email: emptyToNull(church.email),
      websiteUrl: emptyToNull(church.websiteUrl),
      appUrl: emptyToNull(church.appUrl),
      livestreamUrl: emptyToNull(church.livestreamUrl)
    },
    leaders: (church.leadership ?? []).map((leader) => ({
      fullName: leader.fullName,
      title: emptyToNull(leader.title),
      bio: null,
      photoUrl: null
    })),
    serviceTimes: church.serviceTimes.map((service, index) => {
      const displayTime = service.endTime
        ? `${service.startTime} - ${service.endTime}`
        : service.startTime;

      return {
        // Mock records have no service-time ids; derive a stable one so client
        // list keys survive re-renders. Prisma rows supply a real id later.
        id: `${church.slug}-service-${index}`,
        serviceName: service.serviceName,
        dayOfWeek: normalizeDayOfWeek(service.dayOfWeek),
        startTime: parseDisplayTime(service.startTime) ?? service.startTime,
        endTime: service.endTime ? parseDisplayTime(service.endTime) : null,
        displayTime,
        notes: emptyToNull(service.notes)
      };
    }),
    ministries: church.ministries.map((name, index) => ({
      id: `${church.slug}-ministry-${index}`,
      name,
      description: null
    })),
    socialLinks: church.socialLinks.flatMap((link) => {
      const platform = toSocialPlatform(link.platform);
      return platform ? [{ platform, url: link.url }] : [];
    })
  };
}

export function toCity(city: CityRecord, churchCount: number): City {
  return {
    id: city.id,
    slug: city.slug,
    name: city.name,
    county: city.county,
    state: city.state,
    description: emptyToNull(city.description),
    churchCount
  };
}
