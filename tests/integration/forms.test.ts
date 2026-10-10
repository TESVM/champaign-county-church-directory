import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { getChurchBySlug, listChurches } from "@/lib/services/churches";
import { inviteTeamMember } from "@/lib/services/claims";
import { listSubmissions, resolveCorrection, reviewSubmission, submitContactMessage, submitCorrection, submitNewChurch } from "@/lib/services/inbox";
import { actorFor, makeChurch, resetDatabase } from "./helpers";

describe("public forms reach the review workflow", () => {
  beforeEach(resetDatabase);

  it("contact messages are saved and staff are notified", async () => {
    await submitContactMessage({ name: "Visitor", email: "v@test.invalid", message: "How do I add our food pantry?" }, "c1");
    const prisma = await db();
    expect(await prisma.contactMessage.count({ where: { status: "NEW" } })).toBe(1);
    expect(await prisma.outboundEmail.count({ where: { to: "staff@test.invalid" } })).toBe(1);
  });

  it("invalid input is rejected with field errors and nothing is saved", async () => {
    const error = await submitContactMessage({ name: "", email: "nope", message: "hi" }, "c2").catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(Object.keys((error as ValidationError).fieldErrors).sort()).toEqual(["email", "message", "name"]);
    await expect(submitContactMessage({ name: "Spam", email: "s@test.invalid", message: "http://a http://b http://c http://d" }, "c2")).rejects.toBeInstanceOf(ValidationError);
    const prisma = await db();
    expect(await prisma.contactMessage.count()).toBe(0);
  });

  it("corrections are stored against the church and copied to its managers", async () => {
    const church = await makeChurch();
    const admin = await actorFor("admin@test.invalid", "ADMIN");
    await inviteTeamMember(admin, church.id, { email: "owner@church.test", role: "CHURCH_OWNER" });
    await submitCorrection({ churchSlug: church.slug, fieldName: "serviceTimes", details: "Sunday service moved to 11 AM.", reporterEmail: "member@test.invalid" }, "c3");
    const prisma = await db();
    const report = await prisma.correctionReport.findFirstOrThrow();
    expect(report).toMatchObject({ churchId: church.id, status: "NEW" });
    expect(await prisma.outboundEmail.count({ where: { to: "owner@church.test", subject: { contains: "outdated" } } })).toBe(1);
    await resolveCorrection(admin, report.id, "RESOLVED", "Updated, thank you.");
    expect((await prisma.correctionReport.findUniqueOrThrow({ where: { id: report.id } })).status).toBe("RESOLVED");
  });

  it("a new church submission persists, flags duplicates, and approval publishes it", async () => {
    await makeChurch({ name: "Existing Grace Church", slug: "existing-grace" });
    await expect(
      submitNewChurch({ churchName: "Existing Grace Church", citySlug: "testville", address1: "9 Elm St", serviceTimes: "Sunday 10 AM", contactName: "Jo", contactEmail: "jo@test.invalid" }, "c4")
    ).rejects.toThrow(/already listed/);

    await submitNewChurch(
      { churchName: "New Hope Test Chapel", citySlug: "testville", address1: "77 Oak Street", zip: "61820", phone: "2175550177", websiteUrl: "newhope.test", serviceTimes: "Sunday 10:30 AM\nWednesday 6:30 pm Bible study", contactName: "Jo", contactEmail: "jo@test.invalid" },
      "c4"
    );
    const reviewer = await actorFor("reviewer@test.invalid", "REVIEWER");
    const [pending] = await listSubmissions(reviewer);
    expect(pending.data.churchName).toBe("New Hope Test Chapel");
    expect((await listChurches({ q: "New Hope Test" })).total).toBe(0);

    const { churchSlug } = await reviewSubmission(reviewer, { submissionId: pending.id, decision: "APPROVED" });
    const published = await getChurchBySlug(churchSlug!);
    expect(published?.church).toMatchObject({ name: "New Hope Test Chapel", phone: "(217) 555-0177", websiteUrl: "https://newhope.test/", verified: false });
    expect(published?.church.serviceDetails?.map((s) => `${s.dayOfWeek} ${s.startTime}`)).toEqual(["Sunday 10:30 AM", "Wednesday 6:30 PM"]);
    expect((await listChurches({ q: "New Hope Test" })).total).toBe(1);
    await expect(reviewSubmission(reviewer, { submissionId: pending.id, decision: "APPROVED" })).rejects.toBeInstanceOf(ValidationError);
  });
});
