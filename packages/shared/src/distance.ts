/**
 * Geographic distance helpers, shared by the web API and the mobile client.
 *
 * The mobile app sorts by distance on-device rather than asking the server to
 * do it, so the user's coordinates never leave the phone. That keeps the
 * location permission string truthful and the App Store privacy label at
 * "Data Not Collected".
 */

export type Coordinates = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance in miles.
 *
 * Haversine is accurate to well under a percent at county scale and needs no
 * projection, which is more than enough for ordering a church list.
 */
export function distanceInMiles(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  // Clamp guards against a value fractionally above 1 from floating-point
  // error, which would make asin return NaN for two identical points.
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** A record that may or may not have been geocoded. */
type Locatable = {
  address: { latitude: number | null; longitude: number | null };
};

/**
 * Orders items by distance from `origin`.
 *
 * Items without coordinates keep their relative order and sort last rather than
 * being dropped: two churches could not be matched by the geocoder, and hiding
 * them would make them unreachable from this screen.
 */
export function sortByDistance<T extends Locatable>(
  items: readonly T[],
  origin: Coordinates
): Array<T & { distanceMiles: number | null }> {
  return items
    .map((item) => {
      const { latitude, longitude } = item.address;
      const distanceMiles =
        latitude !== null && longitude !== null
          ? distanceInMiles(origin, { latitude, longitude })
          : null;
      return { ...item, distanceMiles };
    })
    .sort((a, b) => {
      if (a.distanceMiles === null && b.distanceMiles === null) return 0;
      if (a.distanceMiles === null) return 1;
      if (b.distanceMiles === null) return -1;
      return a.distanceMiles - b.distanceMiles;
    });
}

/** "0.3 mi" / "4.2 mi" / "12 mi" — precision drops as distance grows. */
export function formatDistance(miles: number): string {
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}
