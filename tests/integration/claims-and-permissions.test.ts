import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { setComplimentary, startCheckout } from "@/lib/services/billing";
import { getChurchBySlug, markPublicSourceChecked, setChurchStatus, updateChurchProfile } from "@/lib/services/churches";
import { inviteTeamMember, reviewClaim, revokeTeamMember, setStaffRole, submitClaim } from "@/lib/services/claims";
import { moderateResource, saveEvent, saveResource, saveVisitorGuide } from "@/lib/services/engagement";
import { decideSuggestedChange } from "@/lib/scan/website-review";
import { actorFor, anonymous, refreshActor, makeChurch, resetDatabase } from "./helpers";

const validProfile = (overrides: Record<string, unknown> = {}) => ({
  name: "Test Fellowship",
  citySlug: "testville",
  address1: "1 Main Street",
  zip: "61820",
  phone: "217-555-0199",
  websiteUrl: "church.test",
  appStoreUrl: "https://apps.apple.com/us/app/example/id1",
  googlePlayUrl: "https://play.google.com/store/apps/details?id=test.app",
  livestreamUrl: "https://www.youtube.com/@testfellowship/live",
  facebookUrl: "https://www.facebook.com/testfellowship",
  pastorName: "Rev. Test Person",
  ministries: ["Youth", "Choir"],
  leaders: JSON.stringify([{ fullName: "Deacon Example", title: "Deacon" }]),
  services: JSON.stringify([
    { serviceName: "Morning Worship", dayOfWeek: "Sunday", startTime: "10:30 am" },
    { serviceName: "Bible Study", dayOfWeek: "Wednesday", startTime: "7pm", language: "Spanish" }
  ]),
  ...overrides
});

describe("claim → approval → leader editing", () => {
  beforeEach(resetDatabase);

  it("persists a claim, routes it to review, and approval grants owner access to that church only", async () => {
    const church = await makeChurch({ websiteUrl: "https://www.gracetest.org/" });
    const other = await makeChurch();
    const result = await submitClaim(
      { churchSlug: church.slug, contactName: "Pat Pastor", contactEmail: "pat@gracetest.org", role: "Pastor", verificationMethod: "DOMAIN_EMAIL", evidence: "Listed on the staff page of our website." },
      "client-a"
    );
    const prisma = await db();
    const claim = await prisma.claimRequest.findUniqueOrThrow({ where: { id: result.id } });
    expect(claim).toMatchObject({ status: "PENDING", emailDomainMatches: true });
    expect(await prisma.outboundEmail.count({ where: { to: "staff@test.invalid" } })).toBe(1);

    // A second submission updates the same open request instead of duplicating it.
    const again = await submitClaim(
      { churchSlug: church.slug, contactName: "Pat Pastor", contactEmail: "pat@gracetest.org", role: "Pastor", verificationMethod: "DOMAIN_EMAIL", evidence: "Also on the bulletin." },
      "client-a"
    );
    expect(again.updatedExisting).toBe(true);
    expect(await prisma.claimRequest.count()).toBe(1);

    const reviewer = await actorFor("reviewer@test.invalid", "REVIEWER");
    await reviewClaim(reviewer, { claimId: claim.id, decision: "APPROVED" });
    expect((await prisma.church.findUniqueOrThrow({ where: { id: church.id } })).claimed).toBe(true);
    expect(await prisma.outboundEmail.count({ where: { to: "pat@gracetest.org", subject: { contains: "You can now manage" } } })).toBe(1);

    const owner = await actorFor("pat@gracetest.org");
    expect(owner.memberships).toEqual([expect.objectContaining({ churchId: church.id, role: "CHURCH_OWNER" })]);

    const saved = await updateChurchProfile(owner, church.id, validProfile({ name: church.name }));
    expect(saved.changedFields).toEqual(expect.arrayContaining(["phone", "services", "ministries", "leaders", "socialLinks"]));
    const resaved = await updateChurchProfile(owner, church.id, validProfile({ name: church.name }));
    expect(resaved.changedFields).toEqual([]);
    await expect(updateChurchProfile(owner, other.id, validProfile())).rejects.toBeInstanceOf(ForbiddenError);

    // Saved edits are visible through the public read path, and mark leadership confirmation.
    const reread = await getChurchBySlug(church.slug);
    expect(reread?.church).toMatchObject({
      phone: "(217) 555-0199",
      websiteUrl: "https://church.test/",
      appStoreUrl: "https://apps.apple.com/us/app/example/id1",
      googlePlayUrl: "https://play.google.com/store/apps/details?id=test.app",
      livestreamUrl: "https://www.youtube.com/@testfellowship/live"
    });
    expect(reread?.church.serviceDetails?.map((s) => [s.dayOfWeek, s.startTime, s.startMinutes, s.language ?? null])).toEqual([
      ["Sunday", "10:30 AM", 630, null],
      ["Wednesday", "7:00 PM", 1140, "Spanish"]
    ]);
    expect(reread?.church.socialLinks).toEqual([{ platform: "facebook", url: "https://www.facebook.com/testfellowship" }]);
    expect(reread?.church.leadershipConfirmedAt).toBeTruthy();
    expect(await prisma.auditLog.count({ where: { action: "church.profile_updated", churchId: church.id } })).toBe(2);
  });

  it("requires a note to decline or ask for more information, and cannot decide twice", async () => {
    const church = await makeChurch();
    const { id } = await submitClaim(
      { churchSlug: church.slug, contactName: "Sam", contactEmail: "sam@gmail.test", role: "Volunteer", verificationMethod: "MANUAL_REVIEW", evidence: "I run the bulletin." },
      "client-b"
    );
    const reviewer = await actorFor("reviewer@test.invalid", "REVIEWER");
    await expect(reviewClaim(reviewer, { claimId: id, decision: "DENIED" })).rejects.toBeInstanceOf(ValidationError);
    await reviewClaim(reviewer, { claimId: id, decision: "MORE_INFO", reviewerNote: "Please have the pastor email us." });
    await reviewClaim(reviewer, { claimId: id, decision: "DENIED", reviewerNote: "Could not confirm." });
    await expect(reviewClaim(reviewer, { claimId: id, decision: "APPROVED" })).rejects.toBeInstanceOf(ValidationError);
    const prisma = await db();
    expect(await prisma.churchMembership.count()).toBe(0);
  });

  it("rejects invalid platform links with field-level errors and saves nothing", async () => {
    const church = await makeChurch();
    const admin = await actorFor("admin@test.invalid", "ADMIN");
    const error = await updateChurchProfile(admin, church.id, validProfile({ appStoreUrl: "https://evil.test/app", facebookUrl: "javascript:alert(1)", zip: "abc" })).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(Object.keys((error as ValidationError).fieldErrors).sort()).toEqual(["appStoreUrl", "facebookUrl", "zip"]);
    const prisma = await db();
    expect((await prisma.church.findUniqueOrThrow({ where: { id: church.id } })).appStoreUrl).toBeNull();
  });
});

describe("owners, editors, and revocation", () => {
  beforeEach(resetDatabase);

  it("owners invite editors; editors edit but cannot manage the team or billing; access can be revoked", async () => {
    const church = await makeChurch();
    const admin = await actorFor("admin@test.invalid", "ADMIN");
    await inviteTeamMember(admin, church.id, { email: "owner@church.test", role: "CHURCH_OWNER" });
    const owner = await actorFor("owner@church.test");
    await expect(inviteTeamMember(owner, church.id, { email: "second-owner@church.test", role: "CHURCH_OWNER" })).rejects.toBeInstanceOf(ForbiddenError);
    const invite = await inviteTeamMember(owner, church.id, { email: "editor@church.test" });
    expect(invite.emailed).toBe(true);

    const editor = await actorFor("editor@church.test");
    expect(editor.memberships[0]).toMatchObject({ churchId: church.id, role: "CHURCH_EDITOR" });
    await updateChurchProfile(editor, church.id, validProfile({ name: church.name }));
    await saveVisitorGuide(editor, church.id, { parking: "Lot behind the building", wheelchairAccessible: "yes", languages: ["English", "Spanish"] });
    await expect(inviteTeamMember(editor, church.id, { email: "x@church.test" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(startCheckout(editor, church.id, "http://localhost:3004")).rejects.toBeInstanceOf(ForbiddenError);

    const prisma = await db();
    const membership = await prisma.churchMembership.findFirstOrThrow({ where: { user: { email: "editor@church.test" } } });
    await revokeTeamMember(owner, membership.id);
    const revoked = await refreshActor(editor);
    await expect(updateChurchProfile(revoked, church.id, validProfile({ name: church.name }))).rejects.toBeInstanceOf(ForbiddenError);

    // Owners cannot remove another owner; only admins can.
    const ownerMembership = await prisma.churchMembership.findFirstOrThrow({ where: { user: { email: "owner@church.test" } } });
    await expect(revokeTeamMember(editor, ownerMembership.id)).rejects.toBeInstanceOf(ForbiddenError);
    await revokeTeamMember(admin, ownerMembership.id);
    expect((await prisma.church.findUniqueOrThrow({ where: { id: church.id } })).claimed).toBe(false);
  });
});

describe("unauthorised requests change nothing", () => {
  beforeEach(resetDatabase);

  it("anonymous visitors and church users cannot reach admin or other churches' actions", async () => {
    const church = await makeChurch();
    const otherChurch = await makeChurch();
    const admin = await actorFor("admin@test.invalid", "ADMIN");
    await inviteTeamMember(admin, otherChurch.id, { email: "other-owner@church.test", role: "CHURCH_OWNER" });
    const outsider = await actorFor("other-owner@church.test");
    const support = await actorFor("support@test.invalid", "SUPPORT");

    for (const actor of [anonymous, outsider]) {
      await expect(updateChurchProfile(actor, church.id, validProfile())).rejects.toBeInstanceOf(ForbiddenError);
      await expect(saveVisitorGuide(actor, church.id, {})).rejects.toBeInstanceOf(ForbiddenError);
      await expect(saveEvent(actor, church.id, {})).rejects.toBeInstanceOf(ForbiddenError);
      await expect(saveResource(actor, church.id, {})).rejects.toBeInstanceOf(ForbiddenError);
      await expect(inviteTeamMember(actor, church.id, { email: "x@test.invalid" })).rejects.toBeInstanceOf(ForbiddenError);
      await expect(startCheckout(actor, church.id, "http://localhost")).rejects.toBeInstanceOf(ForbiddenError);
      await expect(setChurchStatus(actor, church.id, { status: "HIDDEN" })).rejects.toBeInstanceOf(ForbiddenError);
      await expect(markPublicSourceChecked(actor, church.id, "https://x.test")).rejects.toBeInstanceOf(ForbiddenError);
      await expect(setComplimentary(actor, church.id, { until: "2030-01-01", reason: "x" })).rejects.toBeInstanceOf(ForbiddenError);
      await expect(reviewClaim(actor, { claimId: "x", decision: "APPROVED" })).rejects.toBeInstanceOf(ForbiddenError);
      await expect(decideSuggestedChange(actor, "x", "APPROVED")).rejects.toBeInstanceOf(ForbiddenError);
      await expect(moderateResource(actor, "x", "APPROVED")).rejects.toBeInstanceOf(ForbiddenError);
      await expect(setStaffRole(actor, { email: "me@test.invalid", role: "ADMIN" })).rejects.toBeInstanceOf(ForbiddenError);
    }
    // Support staff answer messages but cannot approve or grant billing.
    await expect(reviewClaim(support, { claimId: "x", decision: "APPROVED" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(setComplimentary(support, church.id, { until: "2030-01-01", reason: "x" })).rejects.toBeInstanceOf(ForbiddenError);

    const prisma = await db();
    const unchanged = await prisma.church.findUniqueOrThrow({ where: { id: church.id } });
    expect(unchanged.status).toBe("ACTIVE");
    expect(unchanged.complimentaryPremiumUntil).toBeNull();
  });
});
