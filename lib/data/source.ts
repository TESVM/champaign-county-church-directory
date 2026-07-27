import type { ChurchDetail, ChurchQuery, ChurchSummary, City } from "@cccd/shared";
import { env } from "@/lib/env";
import { toChurchDetail, toChurchSummary, toCity } from "@/lib/api/serializers";
import {
  churchInclude,
  mapChurchRowToDetail,
  mapChurchRowToSummary,
  type ChurchRow
} from "@/lib/data/prisma-source";
import {
  countPublishedChurchesByCity,
  getPublishedChurchBySlug,
  getPublishedChurches,
  getPublishedCities
} from "@/lib/data/published";

/**
 * The read path for published directory data.
 *
 * Reads from Postgres when `DATABASE_URL` is configured and from the in-repo
 * records otherwise, so local development and preview deploys work with no
 * database while production serves live, editable data.
 *
 * A database error is **thrown**, never swallowed. The previous `withFallback`
 * helper caught every failure and returned mock records, so an outage rendered
 * as plausible fake data and an administrator could make decisions on invented
 * numbers with nothing on screen indicating a problem. Callers surface the
 * failure instead.
 */

export type DataSourceName = "database" | "static";

export class DataSourceError extends Error {
  readonly source: DataSourceName;

  constructor(message: string, source: DataSourceName, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DataSourceError";
    this.source = source;
  }
}

export function activeDataSource(): DataSourceName {
  return env.hasDatabase ? "database" : "static";
}

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma/client");
  return prisma;
}

export type ChurchPage = {
  items: ChurchSummary[];
  total: number;
  nextOffset: number | null;
  source: DataSourceName;
};

/**
 * Translates contract filters into a Prisma `where` clause.
 *
 * `mode: "insensitive"` matters: the static path lower-cases both sides, and
 * without it Postgres would be case-sensitive and silently return fewer results
 * for the same query.
 */
function buildWhere(query: Partial<ChurchQuery>) {
  const where: Record<string, unknown> = {};
  const and: unknown[] = [];

  if (query.q) {
    and.push({
      OR: [
        { name: { contains: query.q, mode: "insensitive" } },
        { city: { contains: query.q, mode: "insensitive" } },
        { denomination: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
        { seniorPastor: { fullName: { contains: query.q, mode: "insensitive" } } }
      ]
    });
  }

  if (query.city) and.push({ cityRecord: { slug: query.city } });
  if (query.denomination) {
    and.push({ denomination: { contains: query.denomination, mode: "insensitive" } });
  }
  if (query.pastor) {
    and.push({ seniorPastor: { fullName: { contains: query.pastor, mode: "insensitive" } } });
  }
  if (query.ministry) {
    and.push({ ministries: { some: { name: { contains: query.ministry, mode: "insensitive" } } } });
  }
  if (query.serviceDay) {
    // dayOfWeek is stored as free text ("Sunday"), so match case-insensitively
    // against the enum value rather than expecting an exact match.
    and.push({
      serviceTimes: {
        some: { dayOfWeek: { equals: query.serviceDay, mode: "insensitive" } }
      }
    });
  }

  if (query.verified === true) and.push({ verified: true });
  if (query.claimed === true) and.push({ claimed: true });
  if (query.hasWebsite === true) and.push({ NOT: { websiteUrl: null } });
  if (query.hasApp === true) and.push({ NOT: { appUrl: null } });
  if (query.hasLivestream === true) and.push({ NOT: { livestreamUrl: null } });

  if (and.length > 0) where.AND = and;
  return where;
}

export async function fetchChurches(
  query: Partial<ChurchQuery>,
  offset: number,
  limit: number
): Promise<ChurchPage> {
  if (!env.hasDatabase) {
    const filtered = filterStatic(query);
    return {
      items: filtered.slice(offset, offset + limit).map(toChurchSummary),
      total: filtered.length,
      nextOffset: offset + limit < filtered.length ? offset + limit : null,
      source: "static"
    };
  }

  try {
    const prisma = await getPrisma();
    const where = buildWhere(query);

    const [rows, total] = await Promise.all([
      prisma.church.findMany({
        where,
        include: churchInclude,
        // Stable ordering; without a tiebreaker, cursor pagination can repeat or
        // skip a record between requests.
        orderBy: [{ city: "asc" }, { name: "asc" }, { id: "asc" }],
        skip: offset,
        take: limit
      }),
      prisma.church.count({ where })
    ]);

    return {
      items: (rows as unknown as ChurchRow[]).map(mapChurchRowToSummary),
      total,
      nextOffset: offset + limit < total ? offset + limit : null,
      source: "database"
    };
  } catch (error) {
    throw new DataSourceError("Could not load churches.", "database", { cause: error });
  }
}

export async function fetchChurchBySlug(slug: string): Promise<ChurchDetail | null> {
  if (!env.hasDatabase) {
    const church = getPublishedChurchBySlug(slug);
    return church ? toChurchDetail(church) : null;
  }

  try {
    const prisma = await getPrisma();
    const row = await prisma.church.findUnique({ where: { slug }, include: churchInclude });
    return row ? mapChurchRowToDetail(row as unknown as ChurchRow) : null;
  } catch (error) {
    throw new DataSourceError("Could not load that church.", "database", { cause: error });
  }
}

export async function fetchCities(): Promise<City[]> {
  if (!env.hasDatabase) {
    return getPublishedCities()
      .map((city) => toCity(city, countPublishedChurchesByCity(city.slug)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  try {
    const prisma = await getPrisma();
    const rows = await prisma.city.findMany({
      include: { _count: { select: { churches: true } } },
      orderBy: { name: "asc" }
    });

    return rows
      .map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        county: row.county,
        state: row.state,
        description: null,
        churchCount: row._count.churches
      }))
      // A city page with no churches is a dead end for the user.
      .filter((city) => city.churchCount > 0);
  } catch (error) {
    throw new DataSourceError("Could not load cities.", "database", { cause: error });
  }
}

export async function fetchCityBySlug(slug: string): Promise<City | null> {
  const cities = await fetchCities();
  return cities.find((city) => city.slug === slug) ?? null;
}

/** Static-path filtering, mirroring `buildWhere`. */
function filterStatic(query: Partial<ChurchQuery>) {
  const churches = getPublishedChurches();
  const needle = query.q?.toLowerCase();

  return churches
    .filter((church) => {
      if (needle) {
        const haystack = [
          church.name,
          church.city,
          church.denomination,
          church.description,
          church.pastor?.fullName
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
          (s) => s.dayOfWeek.trim().toUpperCase() === query.serviceDay
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
    })
    .sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
}
