import { describe, expect, it } from "vitest";
import {
  mapChurchRowToDetail,
  mapChurchRowToSummary,
  type ChurchRow
} from "@/lib/data/prisma-source";

/**
 * The Prisma read path cannot be exercised end to end here: no Postgres is
 * available on this machine. The row-to-contract mapping is where the bugs
 * live, so it is pure and tested directly with representative rows. The query
 * functions around it are intentionally thin.
 */

function makeRow(overrides: Partial<ChurchRow> = {}): ChurchRow {
  return {
    id: "church-1",
    slug: "grace-church",
    name: "Grace Church",
    denomination: "Baptist",
    description: "A welcoming congregation.",
    address1: "100 Main St",
    address2: null,
    city: "Champaign",
    state: "IL",
    zip: "61820",
    phone: "(217) 555-0100",
    email: "office@grace.example",
    websiteUrl: "https://grace.example",
    appUrl: null,
    livestreamUrl: "https://youtube.com/live",
    logoUrl: null,
    featuredImageUrl: null,
    featuredImageIsAi: false,
    latitude: 40.1164,
    longitude: -88.2434,
    verified: true,
    claimed: false,
    lastUpdatedAt: new Date("2026-05-01T12:00:00.000Z"),
    updatedAt: new Date("2026-06-01T12:00:00.000Z"),
    cityRecord: { slug: "champaign", name: "Champaign" },
    seniorPastor: {
      fullName: "Pastor Ada Reed",
      title: "Senior Pastor",
      bio: null,
      photoUrl: null
    },
    leaders: [],
    serviceTimes: [
      {
        id: "svc-1",
        serviceName: "Sunday Worship",
        dayOfWeek: "Sunday",
        startTime: "09:00",
        endTime: "10:15",
        notes: null
      }
    ],
    ministries: [{ id: "min-1", name: "Kids", description: null }],
    socialLinks: [{ platform: "facebook", url: "https://facebook.com/grace" }],
    ...overrides
  };
}

describe("mapChurchRowToSummary", () => {
  it("maps a fully populated row", () => {
    const summary = mapChurchRowToSummary(makeRow());

    expect(summary.slug).toBe("grace-church");
    expect(summary.city).toEqual({ slug: "champaign", name: "Champaign" });
    expect(summary.address.latitude).toBe(40.1164);
    expect(summary.verified).toBe(true);
    expect(summary.hasWebsite).toBe(true);
    expect(summary.hasApp).toBe(false);
    expect(summary.hasLivestream).toBe(true);
  });

  it("prefers the city relation over the denormalised string", () => {
    // Church.city and Church.cityId can disagree: saveChurchListingRecord
    // updates the string without touching the relation. The relation wins.
    const summary = mapChurchRowToSummary(
      makeRow({ city: "Stale Name", cityRecord: { slug: "savoy", name: "Savoy" } })
    );

    expect(summary.city.name).toBe("Savoy");
    expect(summary.city.slug).toBe("savoy");
    expect(summary.address.city).toBe("Savoy");
  });

  it("falls back to the string when the relation is missing", () => {
    const summary = mapChurchRowToSummary(makeRow({ cityRecord: null }));
    expect(summary.city.name).toBe("Champaign");
  });

  it("normalises blank strings to null", () => {
    const summary = mapChurchRowToSummary(
      makeRow({ denomination: "   ", zip: "", logoUrl: null })
    );

    expect(summary.denomination).toBeNull();
    expect(summary.address.zip).toBeNull();
    expect(summary.media.logoUrl).toBeNull();
  });

  it("falls back to updatedAt when lastUpdatedAt is null", () => {
    const summary = mapChurchRowToSummary(makeRow({ lastUpdatedAt: null }));
    expect(summary.lastUpdatedAt).toBe("2026-06-01T12:00:00.000Z");
  });

  it("builds a readable service summary from 24-hour columns", () => {
    const summary = mapChurchRowToSummary(makeRow());
    // Stored as "09:00"; a user should not be shown that.
    expect(summary.serviceSummary).toBe("Sunday 9:00 AM");
  });

  it("returns a null service summary when there are no services", () => {
    expect(mapChurchRowToSummary(makeRow({ serviceTimes: [] })).serviceSummary).toBeNull();
  });

  it("handles a church with no coordinates", () => {
    const summary = mapChurchRowToSummary(makeRow({ latitude: null, longitude: null }));
    expect(summary.address.latitude).toBeNull();
    expect(summary.address.longitude).toBeNull();
  });
});

describe("mapChurchRowToDetail", () => {
  it("formats service times for display while keeping sortable values", () => {
    const detail = mapChurchRowToDetail(makeRow());
    const service = detail.serviceTimes[0]!;

    expect(service.startTime).toBe("09:00");
    expect(service.endTime).toBe("10:15");
    expect(service.displayTime).toBe("9:00 AM - 10:15 AM");
    expect(service.dayOfWeek).toBe("SUNDAY");
  });

  it("handles the noon and midnight boundaries", () => {
    const detail = mapChurchRowToDetail(
      makeRow({
        serviceTimes: [
          { id: "a", serviceName: "Midnight", dayOfWeek: "Sunday", startTime: "00:00", endTime: null, notes: null },
          { id: "b", serviceName: "Noon", dayOfWeek: "Sunday", startTime: "12:00", endTime: null, notes: null }
        ]
      })
    );

    expect(detail.serviceTimes[0]!.displayTime).toBe("12:00 AM");
    expect(detail.serviceTimes[1]!.displayTime).toBe("12:00 PM");
  });

  it("omits the end time from the display string when absent", () => {
    const detail = mapChurchRowToDetail(
      makeRow({
        serviceTimes: [
          { id: "a", serviceName: "Worship", dayOfWeek: "Sunday", startTime: "10:30", endTime: null, notes: null }
        ]
      })
    );
    expect(detail.serviceTimes[0]!.displayTime).toBe("10:30 AM");
  });

  it("drops social links outside the contract enum", () => {
    const detail = mapChurchRowToDetail(
      makeRow({
        socialLinks: [
          { platform: "facebook", url: "https://facebook.com/a" },
          { platform: "myspace", url: "https://myspace.com/a" },
          { platform: "INSTAGRAM", url: "https://instagram.com/a" }
        ]
      })
    );

    // Unknown platforms would render as an undefined icon component and crash.
    expect(detail.socialLinks.map((l) => l.platform)).toEqual(["facebook", "instagram"]);
  });

  it("normalises unrecognised service days rather than throwing", () => {
    const detail = mapChurchRowToDetail(
      makeRow({
        serviceTimes: [
          { id: "a", serviceName: "Worship", dayOfWeek: "whenever", startTime: "10:00", endTime: null, notes: null }
        ]
      })
    );
    expect(detail.serviceTimes[0]!.dayOfWeek).toBe("SUNDAY");
  });

  it("maps a minimal row with every optional relation empty", () => {
    const detail = mapChurchRowToDetail(
      makeRow({
        seniorPastor: null,
        leaders: [],
        serviceTimes: [],
        ministries: [],
        socialLinks: [],
        description: null
      })
    );

    expect(detail.seniorPastor).toBeNull();
    expect(detail.leaders).toEqual([]);
    expect(detail.serviceTimes).toEqual([]);
    expect(detail.description).toBeNull();
    expect(detail.shortDescription).toBeNull();
  });
});
