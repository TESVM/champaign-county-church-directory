import { beforeEach, describe, expect, it } from "vitest";
import { POST as activityRoute } from "@/app/api/activity/route";
import { GET as qrRoute } from "@/app/api/churches/[slug]/qr/route";
import { GET as eventIcsRoute } from "@/app/api/events/[id]/ics/route";
import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { setComplimentary } from "@/lib/services/billing";
import { getChurchBySlug, listChurches } from "@/lib/services/churches";
import { inviteTeamMember } from "@/lib/services/claims";
import {
  expandOccurrences,
  getActivitySummary,
  listResources,
  listUpcomingEvents,
  moderateResource,
  recordActivity,
  saveEvent,
  saveResource,
  saveVisitorGuide
} from "@/lib/services/engagement";
import { addDays, chicagoDateOf } from "@/lib/time/chicago";
import { actorFor, makeChurch, resetDatabase } from "./helpers";

async function ownerOf(churchId: string, email = "owner@church.test") {
  const admin = await actorFor("admin@test.invalid", "ADMIN");
  await inviteTeamMember(admin, churchId, { email, role: "CHURCH_OWNER" });
  return { owner: await actorFor(email), admin };
}

describe("Plan your first visit and Find a Service filters", () => {
  beforeEach(resetDatabase);

  it("saves visitor details and powers accessibility, children, and language filters", async () => {
    const church = await makeChurch({ name: "Accessible Test Church" });
    await makeChurch({ name: "Other Test Church" });
    const { owner } = await ownerOf(church.id);
    await saveVisitorGuide(owner, church.id, {
      parking: "North lot",
      wheelchairAccessible: "yes",
      hasChildrenProgram: "yes",
      languages: ["English", "Spanish"],
      whatToExpect: "About an hour of worship."
    });
    const read = await getChurchBySlug(church.slug);
    expect(read?.church.visitorGuide).toMatchObject({ parking: "North lot", wheelchairAccessible: true, hasChildrenProgram: true, languages: ["English", "Spanish"] });
    expect((await listChurches({ wheelchair: true })).items.map((c) => c.id)).toEqual([church.id]);
    expect((await listChurches({ children: true })).total).toBe(1);
    expect((await listChurches({ language: "Spanish" })).total).toBe(1);
    await expect(saveVisitorGuide(owner, church.id, { languages: ["Klingon"] })).rejects.toBeInstanceOf(ValidationError);
  });

  it("matches day and time against the same service, and paginates", async () => {
    const admin = await actorFor("admin@test.invalid", "ADMIN");
    const prisma = await db();
    for (let i = 0; i < 15; i += 1) {
      const c = await makeChurch({ name: `Paged Church ${String(i).padStart(2, "0")}` });
      await prisma.serviceTime.create({ data: { churchId: c.id, serviceName: "Worship", dayOfWeek: "Sunday", startTime: "10:00 AM", startMinutes: 600 } });
    }
    const split = await makeChurch({ name: "Split Times Church" });
    await prisma.serviceTime.createMany({
      data: [
        { churchId: split.id, serviceName: "Worship", dayOfWeek: "Sunday", startTime: "9:00 AM", startMinutes: 540 },
        { churchId: split.id, serviceName: "Study", dayOfWeek: "Wednesday", startTime: "7:00 PM", startMinutes: 1140 }
      ]
    });
    // Sunday evening must not match a church whose evening service is on Wednesday.
    expect((await listChurches({ serviceDay: "Sunday", timeOfDay: "evening" })).total).toBe(0);
    expect((await listChurches({ serviceDay: "Wednesday", timeOfDay: "evening" })).items.map((c) => c.name)).toEqual(["Split Times Church"]);

    const page1 = await listChurches({ serviceDay: "Sunday" }, 1, 12);
    const page2 = await listChurches({ serviceDay: "Sunday" }, 2, 12);
    expect(page1.total).toBe(16);
    expect(page1.pageCount).toBe(2);
    expect(page2.items.length).toBe(4);
    expect(new Set([...page1.items, ...page2.items].map((c) => c.id)).size).toBe(16);
    void admin;
  });

  it("excludes closed and hidden churches from search, and never shows AI images as photos", async () => {
    await makeChurch({ name: "Closed Test Church", status: "CLOSED" });
    await makeChurch({ name: "Hidden Test Church", status: "HIDDEN" });
    const ai = await makeChurch({ name: "AI Image Test Church" });
    const prisma = await db();
    await prisma.church.update({ where: { id: ai.id }, data: { featuredImageUrl: "https://x.public.blob.vercel-storage.com/ai.webp", featuredImageIsAi: true } });
    const results = await listChurches({ q: "Test Church" });
    expect(results.items.map((c) => c.name)).toEqual(["AI Image Test Church"]);
    expect(results.items[0].featuredImageUrl).toBeUndefined();
    expect(await getChurchBySlug("does-not-exist")).toBeNull();
  });
});

describe("Events", () => {
  beforeEach(resetDatabase);

  it("keeps a weekly 7 PM event at 7 PM Central across the November daylight-saving change", () => {
    const church = { slug: "s", name: "S", city: "C", citySlug: "c" };
    const occurrences = expandOccurrences(
      { id: "e1", title: "Choir", description: null, location: null, registrationUrl: null, startDate: "2026-10-21", startTime: "19:00", endTime: null, recurrence: "WEEKLY", recurrenceUntil: "2026-11-18" },
      church,
      "2026-10-01",
      "2026-12-31"
    );
    expect(occurrences.map((o) => o.date)).toEqual(["2026-10-21", "2026-10-28", "2026-11-04", "2026-11-11", "2026-11-18"]);
    // CDT (UTC-5) before 1 Nov 2026, CST (UTC-6) after.
    expect(occurrences[1].startsAt.toISOString()).toBe("2026-10-29T00:00:00.000Z");
    expect(occurrences[2].startsAt.toISOString()).toBe("2026-11-05T01:00:00.000Z");
  });

  it("publishes events for enhanced churches, lists them by city, and serves a valid calendar file", async () => {
    const church = await makeChurch({ citySlug: "eventville", cityName: "Eventville" });
    const { owner, admin } = await ownerOf(church.id);
    await setComplimentary(admin, church.id, { until: addDays(chicagoDateOf(new Date()), 90), reason: "Test" });
    const start = addDays(chicagoDateOf(new Date()), 3);
    await expect(saveEvent(owner, church.id, { title: "Bad", startDate: start, startTime: "19:00", endTime: "18:00" })).rejects.toBeInstanceOf(ValidationError);
    await saveEvent(owner, church.id, { title: "Youth Night", startDate: start, startTime: "19:00", endTime: "20:30", recurrence: "WEEKLY", recurrenceUntil: addDays(start, 21), registrationUrl: "signup.test/youth" });

    const all = await listUpcomingEvents({ days: 60 });
    expect(all.map((o) => o.date)).toEqual([start, addDays(start, 7), addDays(start, 14), addDays(start, 21)]);
    expect((await listUpcomingEvents({ citySlug: "eventville" })).length).toBe(4);
    expect((await listUpcomingEvents({ citySlug: "elsewhere" })).length).toBe(0);

    const response = await eventIcsRoute(new Request("http://localhost"), { params: Promise.resolve({ id: all[0].eventId }) });
    const ics = await response.text();
    expect(response.headers.get("content-type")).toContain("text/calendar");
    expect(ics).toContain("BEGIN:VTIMEZONE");
    expect(ics).toContain(`DTSTART;TZID=America/Chicago:${start.replace(/-/g, "")}T190000`);
    expect(ics).toMatch(/RRULE:FREQ=WEEKLY;UNTIL=\d{8}T\d{6}Z/);
    expect(ics.split("\r\n").every((line) => Buffer.byteLength(line) <= 75)).toBe(true);

    // When the entitlement ends, events leave the public calendar.
    await setComplimentary(admin, church.id, { until: null });
    expect(await listUpcomingEvents({ days: 60 })).toEqual([]);
  });
});

describe("Community resources", () => {
  beforeEach(resetDatabase);

  it("are hidden until approved, searchable after, and re-reviewed after edits", async () => {
    const church = await makeChurch({ name: "Pantry Test Church" });
    const { owner, admin } = await ownerOf(church.id);
    await saveResource(owner, church.id, { category: "FOOD_PANTRY", title: "Saturday Pantry", description: "Groceries for anyone who needs them.", schedule: "Saturdays 9–11 AM", eligibility: "Open to all" });
    expect(await listResources({ q: "pantry" })).toEqual([]);
    const [pending] = await listResources({ status: "PENDING" });
    await expect(moderateResource(admin, pending.id, "REJECTED")).rejects.toBeInstanceOf(ValidationError);
    await moderateResource(admin, pending.id, "APPROVED");
    expect((await listResources({ q: "groceries", category: "FOOD_PANTRY" })).map((r) => r.title)).toEqual(["Saturday Pantry"]);

    await saveResource(owner, church.id, { category: "FOOD_PANTRY", title: "Saturday Pantry", description: "Changed text that needs review." }, pending.id);
    expect(await listResources({ q: "pantry" })).toEqual([]);
  });
});

describe("QR codes and activity counts", () => {
  beforeEach(resetDatabase);

  it("serves a PNG and SVG QR code for active churches only", async () => {
    const church = await makeChurch();
    const png = await qrRoute(new Request("http://localhost/qr"), { params: Promise.resolve({ slug: church.slug }) });
    expect(png.headers.get("content-type")).toBe("image/png");
    const bytes = new Uint8Array(await png.arrayBuffer());
    expect([...bytes.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    const svg = await qrRoute(new Request("http://localhost/qr?format=svg"), { params: Promise.resolve({ slug: church.slug }) });
    expect(await svg.text()).toContain("<svg");
    const missing = await qrRoute(new Request("http://localhost/qr"), { params: Promise.resolve({ slug: "nope" }) });
    expect(missing.status).toBe(404);
  });

  it("counts real actions once per visitor window, ignores bots and bad input, and stores no identifiers", async () => {
    const church = await makeChurch();
    const post = (body: unknown, headers: Record<string, string> = {}) =>
      activityRoute(new Request("http://localhost/api/activity", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.5", ...headers } }));

    expect((await post({ slug: church.slug, metric: "profile_view" })).status).toBe(204);
    expect((await post({ slug: church.slug, metric: "profile_view" })).status).toBe(204); // same visitor, deduplicated
    expect((await post({ slug: church.slug, metric: "profile_view" }, { "x-forwarded-for": "198.51.100.7" })).status).toBe(204);
    expect((await post({ slug: church.slug, metric: "website_click" })).status).toBe(204);
    expect((await post({ slug: church.slug, metric: "profile_view" }, { "user-agent": "Googlebot/2.1", "x-forwarded-for": "192.0.2.9" })).status).toBe(204);
    expect((await post({ slug: church.slug, metric: "made_up" })).status).toBe(400);

    const summary = await getActivitySummary(church.id, 30);
    expect(summary.totals.profile_view).toBe(2);
    expect(summary.totals.website_click).toBe(1);
    expect(summary.series.length).toBe(30);

    const prisma = await db();
    const rows = await prisma.activityDaily.findMany();
    expect(JSON.stringify(rows)).not.toContain("203.0.113.5");
    expect(await recordActivity("unknown-church", "profile_view")).toBe(false);
  });
});

describe("Church photos", () => {
  beforeEach(resetDatabase);

  it("accepts a real image with provenance, rejects disguised files and missing credit, and can be removed", async () => {
    const { saveChurchPhoto, removeChurchPhoto } = await import("@/lib/services/media");
    const church = await makeChurch();
    const { owner } = await ownerOf(church.id);
    const png = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
    const fake = new File([Buffer.from("<script>alert(1)</script>")], "photo.png", { type: "image/png" });

    await expect(saveChurchPhoto(owner, church.id, { file: fake, credit: "Our staff", permission: "Taken by our staff" })).rejects.toBeInstanceOf(ValidationError);
    await expect(saveChurchPhoto(owner, church.id, { file: new File([png], "p.png", { type: "image/png" }) })).rejects.toBeInstanceOf(ValidationError);

    await saveChurchPhoto(owner, church.id, { file: new File([png], "p.png", { type: "image/png" }), credit: "Our staff", permission: "Taken by our staff in 2026" });
    const saved = (await getChurchBySlug(church.slug))!.church;
    expect(saved.featuredImageUrl).toMatch(/^\/uploads\/churches\/.+\.png$/);
    expect(saved.featuredImageCredit).toBe("Our staff");

    await saveChurchPhoto(owner, church.id, { imageUrl: "https://church.test/photo.jpg", credit: "Church website", permission: "Published on our own website" });
    expect((await getChurchBySlug(church.slug))!.church.featuredImageUrl).toBe("https://church.test/photo.jpg");

    await removeChurchPhoto(owner, church.id);
    expect((await getChurchBySlug(church.slug))!.church.featuredImageUrl).toBeUndefined();
    const prisma = await db();
    expect(await prisma.auditLog.count({ where: { action: { in: ["church.photo_replaced", "church.photo_removed"] } } })).toBe(3);
  });
});
