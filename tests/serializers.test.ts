import { describe, expect, it } from "vitest";
import {
  normalizeDayOfWeek,
  parseDisplayTime,
  toChurchDetail,
  toChurchSummary
} from "@/lib/api/serializers";
import { churches } from "@/lib/data/mock";

describe("parseDisplayTime", () => {
  it("converts 12-hour times to 24-hour", () => {
    expect(parseDisplayTime("9:00 AM")).toBe("09:00");
    expect(parseDisplayTime("10:45 AM")).toBe("10:45");
    expect(parseDisplayTime("6:30 PM")).toBe("18:30");
    expect(parseDisplayTime("11:59 PM")).toBe("23:59");
  });

  it("handles the midnight and noon boundaries", () => {
    // The classic off-by-twelve: 12 AM is 00:00, not 12:00, and 12 PM is 12:00,
    // not 24:00.
    expect(parseDisplayTime("12:00 AM")).toBe("00:00");
    expect(parseDisplayTime("12:30 AM")).toBe("00:30");
    expect(parseDisplayTime("12:00 PM")).toBe("12:00");
    expect(parseDisplayTime("12:15 PM")).toBe("12:15");
  });

  it("accepts formatting variations", () => {
    expect(parseDisplayTime("9 AM")).toBe("09:00");
    expect(parseDisplayTime("  9:00 am  ")).toBe("09:00");
    expect(parseDisplayTime("9:00 a.m.")).toBe("09:00");
    expect(parseDisplayTime("9:00AM")).toBe("09:00");
  });

  it("passes through 24-hour input", () => {
    expect(parseDisplayTime("14:30")).toBe("14:30");
    expect(parseDisplayTime("09:05")).toBe("09:05");
  });

  it("returns null for values it cannot parse", () => {
    expect(parseDisplayTime("")).toBeNull();
    expect(parseDisplayTime("noon")).toBeNull();
    expect(parseDisplayTime("25:00")).toBeNull();
    expect(parseDisplayTime("13:00 PM")).toBeNull();
    expect(parseDisplayTime("9:75 AM")).toBeNull();
    expect(parseDisplayTime("Sunday mornings")).toBeNull();
  });
});

describe("normalizeDayOfWeek", () => {
  it("normalises casing and whitespace", () => {
    expect(normalizeDayOfWeek("Sunday")).toBe("SUNDAY");
    expect(normalizeDayOfWeek("  wednesday ")).toBe("WEDNESDAY");
    expect(normalizeDayOfWeek("SATURDAY")).toBe("SATURDAY");
  });

  it("falls back to Sunday for unrecognised input", () => {
    expect(normalizeDayOfWeek("whenever")).toBe("SUNDAY");
  });
});

describe("church serialization over the real dataset", () => {
  it("serialises every church without throwing", () => {
    expect(churches.length).toBeGreaterThan(0);
    for (const church of churches) {
      expect(() => toChurchDetail(church)).not.toThrow();
    }
  });

  it("normalises absent optional values to null rather than undefined", () => {
    // The contract promises null for empty fields so JSON round-trips are stable
    // and clients need only one emptiness check.
    for (const church of churches) {
      const summary = toChurchSummary(church);
      expect(summary.denomination).not.toBeUndefined();
      expect(summary.media.logoUrl).not.toBeUndefined();
      expect(summary.address.zip).not.toBeUndefined();
      expect(summary.lastUpdatedAt).not.toBeUndefined();
    }
  });

  it("derives capability flags from the underlying URLs and the enhanced-profile entitlement", () => {
    for (const church of churches) {
      for (const enhanced of [true, false]) {
        const summary = toChurchSummary({ ...church, enhancedProfile: enhanced });
        expect(summary.hasWebsite).toBe(Boolean(church.websiteUrl?.trim()));
        const anyApp = Boolean(church.appUrl?.trim() || church.appStoreUrl?.trim() || church.googlePlayUrl?.trim());
        expect(summary.hasApp).toBe(enhanced && anyApp);
        expect(summary.hasLivestream).toBe(enhanced && Boolean(church.livestreamUrl?.trim()));
      }
    }
  });

  it("withholds paid-only fields from free listings in the detail payload", () => {
    const church = churches.find((c) => c.livestreamUrl && c.socialLinks.length)!;
    const free = toChurchDetail({ ...church, enhancedProfile: false });
    expect(free.contact.livestreamUrl).toBeNull();
    expect(free.socialLinks).toEqual([]);
    expect(free.ministries).toEqual([]);
    expect(free.contact.websiteUrl).toBe(church.websiteUrl);
    const paid = toChurchDetail({ ...church, enhancedProfile: true });
    expect(paid.contact.livestreamUrl).toBe(church.livestreamUrl);
    expect(paid.socialLinks.length).toBeGreaterThan(0);
  });

  it("gives every nested list item a unique id for stable client keys", () => {
    for (const church of churches) {
      const detail = toChurchDetail(church);
      const serviceIds = detail.serviceTimes.map((s) => s.id);
      const ministryIds = detail.ministries.map((m) => m.id);
      expect(new Set(serviceIds).size).toBe(serviceIds.length);
      expect(new Set(ministryIds).size).toBe(ministryIds.length);
    }
  });

  it("drops social links whose platform is outside the contract enum", () => {
    for (const church of churches) {
      const detail = toChurchDetail(church);
      for (const link of detail.socialLinks) {
        expect(["facebook", "instagram", "youtube", "x", "tiktok"]).toContain(
          link.platform
        );
      }
    }
  });
});
