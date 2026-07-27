import type { ChurchQuery, ChurchSummary } from "@cccd/shared";
import { publishedChurches as churches } from "@/lib/data/published";
import { normalizeDayOfWeek, toChurchSummary } from "@/lib/api/serializers";
import type { ChurchRecord } from "@/lib/types";

/**
 * Query layer behind `/api/v1/churches`.
 *
 * Backed by the in-repo mock records for now. The signature is deliberately
 * async and cursor-based so swapping the body for Prisma `findMany` calls does
 * not change the route handlers or the contract.
 */

function matchesQuery(church: ChurchRecord, query: Partial<ChurchQuery>): boolean {
  if (query.q) {
    const needle = query.q.toLowerCase();
    const haystack = [
      church.name,
      church.city,
      church.denomination,
      church.pastor?.fullName,
      church.shortDescription
    ]
      .filter(Boolean)
      .map((value) => value!.toLowerCase());

    if (!haystack.some((value) => value.includes(needle))) return false;
  }

  if (query.city && church.citySlug !== query.city) return false;

  if (
    query.denomination &&
    !church.denomination?.toLowerCase().includes(query.denomination.toLowerCase())
  ) {
    return false;
  }

  if (
    query.pastor &&
    !church.pastor?.fullName.toLowerCase().includes(query.pastor.toLowerCase())
  ) {
    return false;
  }

  if (
    query.ministry &&
    !church.ministries.some((m) =>
      m.toLowerCase().includes(query.ministry!.toLowerCase())
    )
  ) {
    return false;
  }

  if (
    query.serviceDay &&
    !church.serviceTimes.some(
      (service) => normalizeDayOfWeek(service.dayOfWeek) === query.serviceDay
    )
  ) {
    return false;
  }

  if (query.verified === true && !church.verified) return false;
  if (query.claimed === true && !church.claimed) return false;
  if (query.hasWebsite === true && !church.websiteUrl) return false;
  if (query.hasApp === true && !church.appUrl) return false;
  if (query.hasLivestream === true && !church.livestreamUrl) return false;

  return true;
}

export type ChurchListResult = {
  items: ChurchSummary[];
  total: number;
  nextOffset: number | null;
};

export async function listChurches(
  query: Partial<ChurchQuery>,
  offset: number,
  limit: number
): Promise<ChurchListResult> {
  const filtered = churches.filter((church) => matchesQuery(church, query));

  // Stable ordering matters for cursor pagination: without it, two requests can
  // return the same record twice or skip one entirely.
  const ordered = [...filtered].sort(
    (a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name)
  );

  const page = ordered.slice(offset, offset + limit);
  const nextOffset = offset + limit < ordered.length ? offset + limit : null;

  return {
    items: page.map(toChurchSummary),
    total: ordered.length,
    nextOffset
  };
}

export async function findChurchBySlug(slug: string): Promise<ChurchRecord | null> {
  return churches.find((church) => church.slug === slug) ?? null;
}
