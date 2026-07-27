import { describe, expect, it } from "vitest";
import { distanceInMiles, formatDistance, sortByDistance } from "@cccd/shared";
import { toChurchSummary } from "@/lib/api/serializers";
import { getPublishedChurches } from "@/lib/data/published";

/** Downtown Champaign, used as the reference point for the sorting tests. */
const CHAMPAIGN = { latitude: 40.1164, longitude: -88.2434 };
/** Downtown Urbana, roughly 2 miles east. */
const URBANA = { latitude: 40.1106, longitude: -88.2073 };

describe("distanceInMiles", () => {
  it("returns zero for the same point", () => {
    // Naive haversine returns NaN here when floating-point error pushes the
    // argument of asin fractionally above 1.
    expect(distanceInMiles(CHAMPAIGN, CHAMPAIGN)).toBe(0);
  });

  it("measures a known short distance", () => {
    // Champaign to Urbana city centres is a little under 2 miles.
    const miles = distanceInMiles(CHAMPAIGN, URBANA);
    expect(miles).toBeGreaterThan(1.5);
    expect(miles).toBeLessThan(2.5);
  });

  it("measures a known long distance", () => {
    // Champaign to Chicago is roughly 130 miles.
    const chicago = { latitude: 41.8781, longitude: -87.6298 };
    const miles = distanceInMiles(CHAMPAIGN, chicago);
    expect(miles).toBeGreaterThan(120);
    expect(miles).toBeLessThan(140);
  });

  it("is symmetric", () => {
    expect(distanceInMiles(CHAMPAIGN, URBANA)).toBeCloseTo(
      distanceInMiles(URBANA, CHAMPAIGN),
      10
    );
  });
});

describe("formatDistance", () => {
  it("keeps one decimal under ten miles", () => {
    expect(formatDistance(0.34)).toBe("0.3 mi");
    expect(formatDistance(4.25)).toBe("4.3 mi");
  });

  it("rounds to whole miles at ten and above", () => {
    expect(formatDistance(12.4)).toBe("12 mi");
    expect(formatDistance(130.7)).toBe("131 mi");
  });
});

describe("sortByDistance over the real geocoded dataset", () => {
  const summaries = getPublishedChurches().map(toChurchSummary);

  it("has coordinates for the large majority of churches", () => {
    const located = summaries.filter((c) => c.address.latitude !== null);
    // 53 of 55 were matched by the Census geocoder.
    expect(located.length).toBeGreaterThanOrEqual(50);
  });

  it("orders located churches nearest first", () => {
    const sorted = sortByDistance(summaries, CHAMPAIGN);
    const distances = sorted
      .map((c) => c.distanceMiles)
      .filter((d): d is number => d !== null);

    expect(distances.length).toBeGreaterThan(0);
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]!).toBeGreaterThanOrEqual(distances[i - 1]!);
    }
  });

  it("places churches without coordinates last, never dropping them", () => {
    const sorted = sortByDistance(summaries, CHAMPAIGN);
    // Two churches could not be geocoded; hiding them would make them
    // unreachable from this screen.
    expect(sorted.length).toBe(summaries.length);

    const firstNullIndex = sorted.findIndex((c) => c.distanceMiles === null);
    if (firstNullIndex !== -1) {
      const tail = sorted.slice(firstNullIndex);
      expect(tail.every((c) => c.distanceMiles === null)).toBe(true);
    }
  });

  it("puts a Champaign church first from Champaign and an Urbana one first from Urbana", () => {
    const fromChampaign = sortByDistance(summaries, CHAMPAIGN)[0];
    const fromUrbana = sortByDistance(summaries, URBANA)[0];

    expect(fromChampaign?.distanceMiles).not.toBeNull();
    expect(fromUrbana?.distanceMiles).not.toBeNull();
    // The nearest church to each city centre should differ.
    expect(fromChampaign?.slug).not.toBe(fromUrbana?.slug);
  });

  it("keeps every geocoded church inside Champaign County", () => {
    // A geocoder mismatch on an ambiguous street name would place a church in
    // the wrong state and silently rank it last.
    for (const church of summaries) {
      const { latitude, longitude } = church.address;
      if (latitude === null || longitude === null) continue;
      expect(latitude, church.name).toBeGreaterThan(39.8);
      expect(latitude, church.name).toBeLessThan(40.5);
      expect(longitude, church.name).toBeGreaterThan(-88.6);
      expect(longitude, church.name).toBeLessThan(-87.8);
    }
  });
});
