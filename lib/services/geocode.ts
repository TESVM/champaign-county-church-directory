import { db } from "@/lib/db";
import { log } from "@/lib/log";

/**
 * US Census Bureau geocoder: free, no key, public-domain output. Only church
 * street addresses are sent. An address that cannot be matched inside
 * Champaign County is left without coordinates rather than guessed.
 */
const ENDPOINT = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";

export type Coordinates = { latitude: number; longitude: number };

export function plausibleForChampaignCounty({ latitude, longitude }: Coordinates) {
  return latitude > 39.8 && latitude < 40.5 && longitude > -88.6 && longitude < -87.8;
}

export async function geocodeAddress(address: string, fetcher: typeof fetch = fetch): Promise<Coordinates | null> {
  const url = `${ENDPOINT}?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
  try {
    const response = await fetcher(url, {
      headers: { "User-Agent": "champaign-county-church-directory/1.0 (geocoding church listings)" },
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { result?: { addressMatches?: Array<{ coordinates?: { x: number; y: number } }> } };
    const match = body.result?.addressMatches?.[0]?.coordinates;
    if (!match) return null;
    const coords = { latitude: match.y, longitude: match.x };
    return plausibleForChampaignCounty(coords) ? coords : null;
  } catch (error) {
    log.warn("geocode.failed", { error });
    return null;
  }
}

/** Fills in coordinates for active churches that have an address but none yet. */
export async function geocodeMissingChurches(options: { limit?: number; fetcher?: typeof fetch } = {}) {
  const prisma = await db();
  const churches = await prisma.church.findMany({
    where: { status: "ACTIVE", latitude: null, address1: { not: null } },
    select: { id: true, address1: true, city: true, state: true, zip: true },
    take: options.limit ?? 25
  });
  let matched = 0;
  const unmatched: string[] = [];
  for (const c of churches) {
    const coords = await geocodeAddress(`${c.address1}, ${c.city}, ${c.state} ${c.zip ?? ""}`.trim(), options.fetcher);
    if (coords) {
      await prisma.church.update({ where: { id: c.id }, data: { ...coords, geocodedAt: new Date() } });
      matched += 1;
    } else {
      unmatched.push(c.id);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return { checked: churches.length, matched, unmatched: unmatched.length };
}
