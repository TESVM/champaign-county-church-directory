import { describe, expect, it } from "vitest";
import { nextService } from "@/lib/time/next-service";

describe("nextService", () => {
  const services = [
    { dayOfWeek: "Sunday", startMinutes: 10 * 60 + 30, serviceName: "Worship" },
    { dayOfWeek: "Wednesday", startMinutes: 19 * 60, serviceName: "Bible Study" },
    { dayOfWeek: "Sunday", startMinutes: null, serviceName: "Unknown time" }
  ];

  it("finds the next listed service in Central Time", () => {
    // Saturday 10 Oct 2026, 3:00 PM CDT
    const next = nextService(services, new Date("2026-10-10T20:00:00Z"));
    expect(next).toMatchObject({ label: "Tomorrow 10:30 AM", serviceName: "Worship" });
    expect(next?.at.toISOString()).toBe("2026-10-11T15:30:00.000Z");
  });

  it("says Today when the service is later the same day, and skips services already started", () => {
    // Wednesday 14 Oct 2026, 6:00 PM CDT
    expect(nextService(services, new Date("2026-10-14T23:00:00Z"))?.label).toBe("Today 7:00 PM");
    // Wednesday 14 Oct 2026, 7:30 PM CDT
    expect(nextService(services, new Date("2026-10-15T00:30:00Z"))?.label).toBe("Sun 10:30 AM");
  });

  it("keeps local time across the end of daylight saving", () => {
    // Saturday 31 Oct 2026; DST ends Sunday 1 Nov, so 10:30 AM is 16:30 UTC.
    expect(nextService(services, new Date("2026-10-31T20:00:00Z"))?.at.toISOString()).toBe("2026-11-01T16:30:00.000Z");
  });

  it("returns null when no service has a usable time", () => {
    expect(nextService([{ dayOfWeek: "Sunday", startMinutes: null, serviceName: "x" }])).toBeNull();
  });
});
