import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { setComplimentary } from "@/lib/services/billing";
import {
  getOrganization,
  listCampusEvents,
  listOrganizations,
  listStudentFriendlyChurches,
  reviewCampusEvent,
  reviewOrganization,
  submitCampusEvent,
  submitOrganization
} from "@/lib/services/campus";
import { listChurchesForMap, parseChurchFilters, setFeatured, setStudentTags } from "@/lib/services/churches";
import { saveEvent } from "@/lib/services/engagement";
import { geocodeAddress } from "@/lib/services/geocode";
import { addDays, chicagoDateOf } from "@/lib/time/chicago";
import { actorFor, addMember, anonymous, makeChurch, resetDatabase } from "./helpers";

const validOrg = {
  name: "Test Campus Fellowship",
  campuses: ["uiuc"],
  description: "A weekly gathering for worship, Bible study, and a free meal.",
  meetingTypes: ["worship", "meal"],
  meetingDay: "Thursdays",
  meetingTime: "7:00 PM",
  websiteUrl: "https://fellowship.test/",
  submitterName: "Sam Leader",
  submitterRole: "President",
  submitterEmail: "Sam@Fellowship.test",
  publishContact: "false",
  consentToPublish: "true"
};

let key = 0;
const client = () => `client-${++key}`;

describe("List Your Organization", () => {
  beforeEach(resetDatabase);

  it("requires consent and known campuses, and saves nothing on error", async () => {
    await expect(submitOrganization({ ...validOrg, consentToPublish: undefined }, client())).rejects.toBeInstanceOf(ValidationError);
    await expect(submitOrganization({ ...validOrg, campuses: ["harvard"] }, client())).rejects.toBeInstanceOf(ValidationError);
    await expect(submitOrganization({ ...validOrg, websiteUrl: "javascript:alert(1)" }, client())).rejects.toBeInstanceOf(ValidationError);
    expect(await (await db()).campusOrganization.count()).toBe(0);
  });

  it("stays private until approved, and never publishes the submitter without permission", async () => {
    const { slug } = await submitOrganization(validOrg, client());
    expect(await listOrganizations()).toHaveLength(0);
    expect(await getOrganization(slug)).toBeNull();

    const row = await (await db()).campusOrganization.findUniqueOrThrow({ where: { slug } });
    expect(row).toMatchObject({ status: "PENDING", submitterEmail: "sam@fellowship.test", publicContactEmail: null, publishContact: false, source: "organization" });
    const mail = await (await db()).outboundEmail.findMany();
    expect(mail.map((m) => m.to)).toContain("sam@fellowship.test");
  });

  it("reviewers approve, request changes (with a note), decline, and verify; church editors cannot", async () => {
    const { slug } = await submitOrganization(validOrg, client());
    const id = (await (await db()).campusOrganization.findUniqueOrThrow({ where: { slug } })).id;
    const reviewer = await actorFor("reviewer@test.invalid", "REVIEWER");
    const editor = await actorFor("editor@test.invalid");

    await expect(reviewOrganization(editor, { id, decision: "APPROVED" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(reviewOrganization(reviewer, { id, decision: "CHANGES" })).rejects.toBeInstanceOf(ValidationError);

    await reviewOrganization(reviewer, { id, decision: "CHANGES", note: "Please add a meeting location." });
    expect(await listOrganizations()).toHaveLength(0);

    await reviewOrganization(reviewer, { id, decision: "APPROVED", verify: true });
    const listed = await listOrganizations({ campus: "uiuc" });
    expect(listed.map((o) => o.slug)).toEqual([slug]);
    expect(listed[0].verifiedAt).not.toBeNull();
    expect(await listOrganizations({ campus: "parkland" })).toHaveLength(0);
    expect(await listOrganizations({ type: "meal" })).toHaveLength(1);
    expect(await listOrganizations({ q: "fellowship" })).toHaveLength(1);

    const audit = await (await db()).auditLog.findMany({ where: { entityId: id } });
    expect(audit.map((a) => a.action)).toEqual(expect.arrayContaining(["campus_org.changes", "campus_org.approved"]));
  });
});

describe("student events", () => {
  beforeEach(resetDatabase);

  it("publishes submitted events only after review, and merges tagged church events from entitled churches", async () => {
    const date = addDays(chicagoDateOf(new Date()), 3);
    const { id } = await submitCampusEvent(
      { title: "Worship Night", startDate: date, startTime: "19:00", campuses: ["uiuc"], categories: ["worship-night"], hostName: "Test Ministry", submitterName: "Alex", submitterEmail: "alex@student.test" },
      client()
    );
    expect(await listCampusEvents()).toHaveLength(0);

    const reviewer = await actorFor("reviewer@test.invalid", "REVIEWER");
    await reviewCampusEvent(reviewer, id, "APPROVED");
    const events = await listCampusEvents({ category: "worship-night", campus: "uiuc" });
    expect(events.map((e) => e.title)).toEqual(["Worship Night"]);
    expect(events[0].icsUrl).toBe(`/api/campus-events/${id}/ics`);
    expect(await listCampusEvents({ campus: "parkland" })).toHaveLength(0);

    const church = await makeChurch({ name: "Tagged Church" });
    const admin = await actorFor("admin@test.invalid", "ADMIN");
    await saveEvent(admin, church.id, { title: "College Lunch", startDate: date, startTime: "12:00", recurrence: "NONE", categories: ["free-meal", "not-a-category"] });
    const saved = await (await db()).event.findFirstOrThrow({ where: { churchId: church.id } });
    expect(saved.categories).toEqual(["free-meal"]);
    // Church events reach the calendar only while the church is entitled to events.
    expect((await listCampusEvents()).map((e) => e.title)).not.toContain("College Lunch");
    await setComplimentary(admin, church.id, { until: "2099-01-01", reason: "test" });
    expect((await listCampusEvents({ category: "free-meal" })).map((e) => e.title)).toEqual(["College Lunch"]);
  });

  it("rejects past dates and unknown categories", async () => {
    const base = { title: "Old", startTime: "19:00", campuses: ["uiuc"], hostName: "X", submitterName: "Alex", submitterEmail: "alex@student.test" };
    await expect(submitCampusEvent({ ...base, startDate: addDays(chicagoDateOf(new Date()), -2), categories: ["retreat"] }, client())).rejects.toBeInstanceOf(ValidationError);
    await expect(submitCampusEvent({ ...base, startDate: addDays(chicagoDateOf(new Date()), 2), categories: ["party"] }, client())).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("student-friendly churches, featured placement, and the map", () => {
  beforeEach(resetDatabase);

  it("records who confirmed student tags and validates them", async () => {
    const church = await makeChurch();
    const owner = await actorFor("owner@test.invalid");
    const prisma = await db();
    await addMember(church.id, owner.id, "CHURCH_OWNER");
    const member = await actorFor("owner@test.invalid");
    await expect(setStudentTags(member, church.id, ["free-meal", "bogus"])).rejects.toBeInstanceOf(ValidationError);
    await setStudentTags(member, church.id, ["free-meal", "near-campus"]);
    expect(await prisma.church.findUniqueOrThrow({ where: { id: church.id } })).toMatchObject({ studentTags: ["free-meal", "near-campus"], studentTagsSource: "church" });

    await prisma.church.update({ where: { id: church.id }, data: { latitude: 40.11, longitude: -88.23 } });
    const list = await listStudentFriendlyChurches({ tag: "free-meal" });
    expect(list).toHaveLength(1);
    expect(list[0].tagSource).toBe("church");
    expect(list[0].milesFromUiuc).toBeLessThan(1);
    expect(await listStudentFriendlyChurches({ tag: "rides" })).toHaveLength(0);
  });

  it("only admins can feature a church; featured churches sort first on the map and are flagged", async () => {
    const a = await makeChurch({ name: "Alpha Church" });
    const z = await makeChurch({ name: "Zeta Church" });
    const reviewer = await actorFor("reviewer@test.invalid", "REVIEWER");
    const admin = await actorFor("admin@test.invalid", "ADMIN");
    await expect(setFeatured(reviewer, z.id, true)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(setFeatured(anonymous, z.id, true)).rejects.toBeInstanceOf(ForbiddenError);
    await setFeatured(admin, z.id, true);

    const pins = await listChurchesForMap(parseChurchFilters({}));
    expect(pins.map((p) => [p.name, p.featured])).toEqual([
      ["Zeta Church", true],
      ["Alpha Church", false]
    ]);
    // Featuring never changes which churches match a filter.
    expect((await listChurchesForMap(parseChurchFilters({ q: "Alpha" }))).map((p) => p.slug)).toEqual([a.slug]);
    expect(await listChurchesForMap(parseChurchFilters({ studentFriendly: "true" }))).toHaveLength(0);
  });
});

describe("geocoding", () => {
  it("accepts Census matches inside Champaign County and leaves others blank", async () => {
    const reply = (x: number, y: number) => (async () => new Response(JSON.stringify({ result: { addressMatches: [{ coordinates: { x, y } }] } }))) as unknown as typeof fetch;
    expect(await geocodeAddress("1 Main St, Champaign, IL", reply(-88.24, 40.11))).toEqual({ latitude: 40.11, longitude: -88.24 });
    expect(await geocodeAddress("1 Main St, Springfield, IL", reply(-89.65, 39.8))).toBeNull();
    const none = (async () => new Response(JSON.stringify({ result: { addressMatches: [] } }))) as unknown as typeof fetch;
    expect(await geocodeAddress("nowhere", none)).toBeNull();
    const down = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await geocodeAddress("1 Main St", down)).toBeNull();
  });
});
