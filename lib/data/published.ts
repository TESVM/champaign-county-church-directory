import { churches as allChurches, countyCities } from "@/lib/data/mock";
import type { ChurchRecord, CityRecord } from "@/lib/types";

/**
 * The single source of church data for anything user-facing.
 *
 * `lib/data/mock.ts` mixes real Champaign County churches with six invented
 * ones used for local development. Publishing an invented church in a directory
 * people use to find somewhere to worship is a factual-accuracy problem on the
 * web and an App Store review risk on mobile, so the fixtures are filtered out
 * here exactly once.
 *
 * Import from this module, never from `mock.ts`, in pages, API handlers, and
 * sitemaps. Tests may read `mock.ts` directly.
 */

/** Real, publishable church records. */
export const publishedChurches: ChurchRecord[] = allChurches.filter(
  (church) => church.isFixture !== true
);

export function getPublishedChurches(): ChurchRecord[] {
  return publishedChurches;
}

export function getPublishedChurchBySlug(slug: string): ChurchRecord | null {
  return publishedChurches.find((church) => church.slug === slug) ?? null;
}

export function getPublishedChurchesByCity(citySlug: string): ChurchRecord[] {
  return publishedChurches.filter((church) => church.citySlug === citySlug);
}

/** Cities that actually have a publishable church, so no listing is a dead end. */
export function getPublishedCities(): CityRecord[] {
  const populated = new Set(publishedChurches.map((church) => church.citySlug));
  return countyCities.filter((city) => populated.has(city.slug));
}

export function countPublishedChurchesByCity(citySlug: string): number {
  return publishedChurches.reduce(
    (total, church) => (church.citySlug === citySlug ? total + 1 : total),
    0
  );
}

export { countyCities };
