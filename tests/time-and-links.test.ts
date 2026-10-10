import { describe, expect, it } from "vitest";
import { buildCalendar, foldLine } from "@/lib/ics";
import { emailMatchesWebsite } from "@/lib/security";
import { computeEntitlement } from "@/lib/services/entitlements";
import { addDays, chicagoDateOf, chicagoToUtc, parseTimeToMinutes } from "@/lib/time/chicago";
import { LinkError, normalizeLink, normalizePhone } from "@/lib/validation/links";

describe("America/Chicago conversion", () => {
  it("handles standard and daylight time", () => {
    expect(chicagoToUtc("2026-01-15", "10:00").toISOString()).toBe("2026-01-15T16:00:00.000Z");
    expect(chicagoToUtc("2026-07-15", "10:00").toISOString()).toBe("2026-07-15T15:00:00.000Z");
  });
  it("handles the spring-forward and fall-back days", () => {
    // 8 Mar 2026: 2:00 AM does not exist; 3:00 AM CDT.
    expect(chicagoToUtc("2026-03-08", "03:00").toISOString()).toBe("2026-03-08T08:00:00.000Z");
    expect(chicagoToUtc("2026-03-08", "01:00").toISOString()).toBe("2026-03-08T07:00:00.000Z");
    // 1 Nov 2026: evening is CST.
    expect(chicagoToUtc("2026-11-01", "19:00").toISOString()).toBe("2026-11-02T01:00:00.000Z");
    expect(chicagoToUtc("2026-10-31", "19:00").toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });
  it("finds the Chicago calendar date of late-evening instants", () => {
    expect(chicagoDateOf(new Date("2026-11-02T04:30:00Z"))).toBe("2026-11-01");
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
  });
  it("parses human service times", () => {
    expect(parseTimeToMinutes("10:30 AM")).toBe(630);
    expect(parseTimeToMinutes("7pm")).toBe(1140);
    expect(parseTimeToMinutes("12:00 PM")).toBe(720);
    expect(parseTimeToMinutes("12 am")).toBe(0);
    expect(parseTimeToMinutes("18:45")).toBe(1125);
    expect(parseTimeToMinutes("noonish")).toBeNull();
  });
});

describe("link validation", () => {
  it("normalises ordinary links and rejects dangerous ones", () => {
    expect(normalizeLink("church.org", "website")).toBe("https://church.org/");
    expect(normalizeLink("  ", "website")).toBeNull();
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "https://user:pw@church.org", "http://localhost/x", "https://192.168.1.1/", "ftp://church.org"]) {
      expect(() => normalizeLink(bad, "website")).toThrow(LinkError);
    }
  });
  it("keeps platform links on their platforms", () => {
    expect(normalizeLink("https://apps.apple.com/us/app/x/id1", "appStore")).toContain("apps.apple.com");
    expect(() => normalizeLink("https://play.google.com/store/apps/details?id=x", "appStore")).toThrow(LinkError);
    expect(normalizeLink("https://play.google.com/store/apps/details?id=x", "googlePlay")).toContain("play.google.com");
    expect(normalizeLink("m.facebook.com/church", "facebook")).toBe("https://m.facebook.com/church");
    expect(() => normalizeLink("https://facebook.com.evil.test/x", "facebook")).toThrow(LinkError);
    expect(normalizeLink("https://twitter.com/church", "x")).toBe("https://twitter.com/church");
  });
  it("normalises US phone numbers", () => {
    expect(normalizePhone("217.555.0100")).toBe("(217) 555-0100");
    expect(normalizePhone("+1 (217) 555-0100")).toBe("(217) 555-0100");
    expect(() => normalizePhone("555-0100")).toThrow(LinkError);
  });
  it("matches claim emails to the church's own domain, never to free mail", () => {
    expect(emailMatchesWebsite("pastor@gracechurch.org", "https://www.gracechurch.org/")).toBe(true);
    expect(emailMatchesWebsite("pastor@mail.gracechurch.org", "gracechurch.org")).toBe(true);
    expect(emailMatchesWebsite("pastor@gmail.com", "https://sites.google.com/gmail.com")).toBe(false);
    expect(emailMatchesWebsite("pastor@other.org", "https://gracechurch.org")).toBe(false);
  });
});

describe("entitlement rules", () => {
  const now = new Date("2026-10-08T12:00:00Z");
  const day = 86400000;
  it("grants for active, trialing and past-due subscriptions within the period plus grace", () => {
    for (const status of ["active", "trialing", "past_due"]) {
      expect(computeEntitlement({ complimentaryPremiumUntil: null, subscription: { status, currentPeriodEnd: new Date(now.getTime() + day) } }, now).active).toBe(true);
    }
    expect(computeEntitlement({ complimentaryPremiumUntil: null, subscription: { status: "active", currentPeriodEnd: new Date(now.getTime() - 8 * day) } }, now).active).toBe(false);
  });
  it("denies cancelled, unpaid and incomplete subscriptions", () => {
    for (const status of ["canceled", "unpaid", "incomplete", "incomplete_expired"]) {
      expect(computeEntitlement({ complimentaryPremiumUntil: null, subscription: { status, currentPeriodEnd: new Date(now.getTime() + day) } }, now).active).toBe(false);
    }
  });
  it("honours complimentary grants until their end date", () => {
    expect(computeEntitlement({ complimentaryPremiumUntil: new Date(now.getTime() + day), subscription: null }, now)).toMatchObject({ active: true, source: "complimentary" });
    expect(computeEntitlement({ complimentaryPremiumUntil: new Date(now.getTime() - day), subscription: null }, now).active).toBe(false);
  });
});

describe("iCalendar output", () => {
  it("escapes text, folds long lines, and writes all-day events as dates", () => {
    const ics = buildCalendar(
      [{ id: "e1", title: "Potluck; bring a dish, please", description: "Line one\nLine two", startDate: "2026-12-05", recurrence: "NONE", updatedAt: new Date("2026-10-01T00:00:00Z") }],
      "example.test"
    );
    expect(ics).toContain("SUMMARY:Potluck\; bring a dish\\, please");
    expect(ics).toContain("DESCRIPTION:Line one\\nLine two");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261205");
    expect(ics).toContain("DTEND;VALUE=DATE:20261206");
    expect(foldLine("x".repeat(200)).split("\r\n ").every((part) => Buffer.byteLength(part) <= 75)).toBe(true);
  });
});
