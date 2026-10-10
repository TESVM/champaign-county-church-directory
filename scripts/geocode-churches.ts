/**
 * Geocodes published church addresses.
 *
 * Uses the US Census Bureau geocoder: free, no API key, authoritative for US
 * addresses, and public-domain output. Only the street addresses of churches
 * already published in the directory are sent.
 *
 *   npx tsx scripts/geocode-churches.ts          # geocode and report
 *   npx tsx scripts/geocode-churches.ts --write  # also patch lib/data/mock.ts
 *
 * A church that cannot be matched is left without coordinates. An approximate
 * or invented position would send someone to the wrong building, which is worse
 * than showing no distance at all.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { getPublishedChurches } from "../lib/data/published";

const ENDPOINT = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";
const BENCHMARK = "Public_AR_Current";

/** Census asks for courteous use; one request at a time with a short gap. */
const DELAY_MS = 250;
const TIMEOUT_MS = 20000;
const MAX_ATTEMPTS = 3;

type Coordinates = { latitude: number; longitude: number };

type CensusResponse = {
  result?: {
    addressMatches?: Array<{
      coordinates?: { x: number; y: number };
      matchedAddress?: string;
    }>;
  };
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Champaign County sits inside this box; anything outside is a bad match. */
function isPlausibleForChampaignCounty({ latitude, longitude }: Coordinates) {
  return latitude > 39.8 && latitude < 40.5 && longitude > -88.6 && longitude < -87.8;
}

async function geocodeOnce(address: string): Promise<Coordinates | null> {
  const url = `${ENDPOINT}?address=${encodeURIComponent(address)}&benchmark=${BENCHMARK}&format=json`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "champaign-county-church-directory/1.0 (geocoding church listings)" }
    });

    if (!response.ok) return null;

    const body = (await response.json()) as CensusResponse;
    const match = body.result?.addressMatches?.[0];
    if (!match?.coordinates) return null;

    // Census returns x = longitude, y = latitude.
    const coords = { latitude: match.coordinates.y, longitude: match.coordinates.x };
    return isPlausibleForChampaignCounty(coords) ? coords : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function geocode(address: string): Promise<Coordinates | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await geocodeOnce(address);
    if (result) return result;
    if (attempt < MAX_ATTEMPTS) await sleep(DELAY_MS * attempt * 2);
  }
  return null;
}

async function main() {
  const shouldWrite = process.argv.includes("--write");
  const churches = getPublishedChurches();

  console.log(`Geocoding ${churches.length} published churches via US Census...\n`);

  const resolved = new Map<string, Coordinates>();
  const failed: Array<{ slug: string; name: string; address: string }> = [];

  for (const [index, church] of churches.entries()) {
    const address = `${church.address1}, ${church.city}, ${church.state} ${church.zip}`;
    const coords = await geocode(address);
    const position = `[${String(index + 1).padStart(2, " ")}/${churches.length}]`;

    if (coords) {
      resolved.set(church.slug, coords);
      console.log(
        `${position} OK    ${church.name} -> ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
      );
    } else {
      failed.push({ slug: church.slug, name: church.name, address });
      console.log(`${position} MISS  ${church.name} (${address})`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\nResolved ${resolved.size}/${churches.length}. ${failed.length} unresolved.`);

  if (failed.length > 0) {
    console.log("\nUnresolved (left without coordinates, will sort last):");
    for (const item of failed) console.log(`  - ${item.name}: ${item.address}`);
  }

  if (!shouldWrite) {
    console.log("\nDry run. Re-run with --write to patch lib/data/mock.ts.");
    return;
  }

  const path = "lib/data/mock.ts";
  let source = readFileSync(path, "utf8");
  let patched = 0;

  for (const [slug, coords] of resolved) {
    const marker = `slug: "${slug}",`;
    const at = source.indexOf(marker);
    if (at === -1) continue;

    // Skip if this record already carries coordinates.
    const recordEnd = source.indexOf("\n  },", at);
    if (source.slice(at, recordEnd).includes("latitude:")) continue;

    const lineStart = source.lastIndexOf("\n", at) + 1;
    const indent = source.slice(lineStart, at);
    const insertion = `\n${indent}latitude: ${coords.latitude},\n${indent}longitude: ${coords.longitude},`;

    source = source.slice(0, at + marker.length) + insertion + source.slice(at + marker.length);
    patched++;
  }

  writeFileSync(path, source);
  console.log(`\nPatched ${patched} records in ${path}.`);
}

main().catch((error) => {
  console.error("Geocoding failed:", error);
  process.exit(1);
});
