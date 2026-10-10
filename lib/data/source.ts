import type { ChurchDetail, ChurchQuery, ChurchSummary, City } from "@cccd/shared";
import { toChurchDetail, toChurchSummary } from "@/lib/api/serializers";
import { db } from "@/lib/db";
import { DatabaseUnavailableError } from "@/lib/errors";
import { type ChurchFilters, buildChurchWhere, churchInclude, getChurchBySlug, listCities, mapChurchRow } from "@/lib/services/churches";

/**
 * Read path for the public /api/v1 contract (used by the mobile app).
 *
 * Backed by the same database queries as the web pages, so the app and the
 * site always agree. There is no in-repo fallback: an outage is reported as an
 * error instead of serving stale records.
 */

export class DataSourceError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DataSourceError";
  }
}

function toFilters(query: Partial<ChurchQuery>): ChurchFilters {
  const day = query.serviceDay ? query.serviceDay.charAt(0) + query.serviceDay.slice(1).toLowerCase() : undefined;
  return {
    q: query.q,
    city: query.city,
    denomination: query.denomination,
    pastor: query.pastor,
    ministry: query.ministry,
    serviceDay: day,
    verified: query.verified || undefined,
    claimed: query.claimed || undefined,
    hasWebsite: query.hasWebsite || undefined,
    hasApp: query.hasApp || undefined,
    hasLivestream: query.hasLivestream || undefined
  };
}

async function guard<T>(fn: () => Promise<T>, message: string): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) throw new DataSourceError(message, { cause: error });
    throw new DataSourceError(message, { cause: error });
  }
}

export async function fetchChurches(query: Partial<ChurchQuery>, offset: number, limit: number) {
  return guard(async () => {
    const prisma = await db();
    const where = buildChurchWhere(toFilters(query));
    const [rows, total] = await Promise.all([
      prisma.church.findMany({ where, include: churchInclude, orderBy: [{ city: "asc" }, { name: "asc" }, { id: "asc" }], skip: offset, take: limit }),
      prisma.church.count({ where })
    ]);
    return {
      items: rows.map((row) => toChurchSummary(mapChurchRow(row))) as ChurchSummary[],
      total,
      nextOffset: offset + limit < total ? offset + limit : null
    };
  }, "Could not load churches.");
}

export async function fetchChurchBySlug(slug: string): Promise<ChurchDetail | null> {
  return guard(async () => {
    const result = await getChurchBySlug(slug);
    if (!result || result.church.status !== "ACTIVE") return null;
    return toChurchDetail(result.church);
  }, "Could not load that church.");
}

export async function fetchCities(): Promise<City[]> {
  return guard(async () => {
    const cities = await listCities();
    return cities.map((c) => ({ id: c.id, slug: c.slug, name: c.name, county: c.county, state: c.state, description: c.description || null, churchCount: c.churchCount }));
  }, "Could not load cities.");
}

export async function fetchCityBySlug(slug: string): Promise<City | null> {
  const cities = await fetchCities();
  return cities.find((city) => city.slug === slug) ?? null;
}
