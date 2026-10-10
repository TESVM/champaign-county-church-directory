import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { setComplimentary } from "@/lib/services/billing";
import { closeCollabPost, getCollabPost, listCollabPosts, reportCollabPost, reviewCollabPost, submitCollabPost } from "@/lib/services/collab";
import { endLive, getWorshipHub, isLive, markLive } from "@/lib/services/live";
import { addGalleryPhoto, listGalleryPhotos, MAX_GALLERY_PHOTOS, removeGalleryPhoto } from "@/lib/services/media";
import { addDays, chicagoDateOf } from "@/lib/time/chicago";
import { actorFor, addMember, anonymous, makeChurch, resetDatabase } from "./helpers";

async function churchWithOwner(email = "owner@test.invalid") {
  const church = await makeChurch();
  const user = await actorFor(email);
  await addMember(church.id, user.id, "CHURCH_OWNER");
  return { church, owner: await actorFor(email) };
}

const noFetch = (async () => new Response("", { status: 404 })) as unknown as typeof fetch;

describe("Worship Live & Next", () => {
  beforeEach(resetDatabase);

  it("shows a church as live only after its team says so, only with the livestream feature, and expires on its own", async () => {
    const { church, owner } = await churchWithOwner();
    const prisma = await db();
    await prisma.church.update({ where: { id: church.id }, data: { livestreamUrl: "https://church.test/live" } });

    await expect(markLive(owner, church.id, 2)).rejects.toBeInstanceOf(ForbiddenError);
    const admin = await actorFor("admin@test.invalid", "ADMIN");
    await setComplimentary(admin, church.id, { until: "2099-01-01", reason: "test" });
    await expect(markLive(owner, church.id, 9)).rejects.toBeInstanceOf(ValidationError);
    await expect(markLive(anonymous, church.id, 2)).rejects.toBeInstanceOf(ForbiddenError);

    await markLive(owner, church.id, 2);
    const row = await prisma.church.findUniqueOrThrow({ where: { id: church.id } });
    expect(isLive(row)).toBe(true);
    expect(isLive(row, new Date(Date.now() + 3 * 3_600_000))).toBe(false);
    expect((await getWorshipHub({ fetcher: noFetch })).live.map((l) => l.church.slug)).toEqual([church.slug]);
    expect((await getWorshipHub({ fetcher: noFetch, now: new Date(Date.now() + 3 * 3_600_000) })).live).toHaveLength(0);

    await endLive(owner, church.id);
    expect((await getWorshipHub({ fetcher: noFetch })).live).toHaveLength(0);
  });

  it("refuses to mark live without a livestream link", async () => {
    const { church, owner } = await churchWithOwner();
    const admin = await actorFor("admin@test.invalid", "ADMIN");
    await setComplimentary(admin, church.id, { until: "2099-01-01", reason: "test" });
    await expect(markLive(owner, church.id, 1)).rejects.toBeInstanceOf(ValidationError);
  });

  it("lists the next services across the directory in time order", async () => {
    const a = await makeChurch({ name: "Early Church" });
    const b = await makeChurch({ name: "Later Church" });
    const prisma = await db();
    await prisma.serviceTime.create({ data: { churchId: a.id, serviceName: "Worship", dayOfWeek: "Sunday", startTime: "9:00 AM", startMinutes: 540 } });
    await prisma.serviceTime.create({ data: { churchId: b.id, serviceName: "Worship", dayOfWeek: "Sunday", startTime: "11:00 AM", startMinutes: 660 } });
    // Saturday 10 Oct 2026, noon CDT
    const hub = await getWorshipHub({ fetcher: noFetch, now: new Date("2026-10-10T17:00:00Z") });
    expect(hub.next.map((n) => [n.church.name, n.label])).toEqual([
      ["Early Church", "Tomorrow 9:00 AM"],
      ["Later Church", "Tomorrow 11:00 AM"]
    ]);
    expect(hub.next[0].watchUrl).toBeNull();
  });
});

describe("Church Collaboration Board", () => {
  beforeEach(resetDatabase);
  const end = () => addDays(chicagoDateOf(new Date()), 14);
  const post = (churchId: string) => ({
    churchId,
    category: "volunteers",
    title: "Volunteers for food distribution",
    body: "We need six volunteers to help sort and hand out groceries on Saturday morning.",
    contactEmail: "outreach@church.test",
    expiresOn: end(),
    consent: "true"
  });

  it("only church team members post; posts wait for review and validate expiry, contact, and consent", async () => {
    const { church, owner } = await churchWithOwner();
    const stranger = await actorFor("stranger@test.invalid");
    await expect(submitCollabPost(stranger, post(church.id))).rejects.toBeInstanceOf(ForbiddenError);
    await expect(submitCollabPost(stranger, { ...post(""), organizationName: "X" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(submitCollabPost(owner, { ...post(church.id), expiresOn: addDays(chicagoDateOf(new Date()), 120) })).rejects.toBeInstanceOf(ValidationError);
    await expect(submitCollabPost(owner, { ...post(church.id), contactEmail: "" })).rejects.toBeInstanceOf(ValidationError);
    await expect(submitCollabPost(owner, { ...post(church.id), consent: undefined })).rejects.toBeInstanceOf(ValidationError);
    await expect(submitCollabPost(owner, { ...post(church.id), category: "prayer" })).rejects.toBeInstanceOf(ValidationError);

    const created = await submitCollabPost(owner, post(church.id));
    expect(created.status).toBe("PENDING");
    expect(await listCollabPosts()).toHaveLength(0);
    expect(await getCollabPost(created.id)).toBeNull();

    const reviewer = await actorFor("reviewer@test.invalid", "REVIEWER");
    await expect(reviewCollabPost(owner, created.id, "APPROVED")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(reviewCollabPost(reviewer, created.id, "REJECTED")).rejects.toBeInstanceOf(ValidationError);
    await reviewCollabPost(reviewer, created.id, "APPROVED");
    expect((await listCollabPosts({ category: "volunteers" })).map((p) => p.id)).toEqual([created.id]);
    expect((await listCollabPosts({ churchId: church.id })).map((p) => p.id)).toEqual([created.id]);
    expect(await listCollabPosts({ category: "music" })).toHaveLength(0);
  });

  it("expires, can be taken down by the poster, and hides after three distinct reports", async () => {
    const { church, owner } = await churchWithOwner();
    const reviewer = await actorFor("reviewer@test.invalid", "REVIEWER");
    const created = await submitCollabPost(owner, post(church.id));
    await reviewCollabPost(reviewer, created.id, "APPROVED");

    expect(await listCollabPosts({ now: new Date(Date.now() + 20 * 86_400_000) })).toHaveLength(0);

    await expect(reportCollabPost(created.id, "nonsense", "1.1.1.1")).rejects.toBeInstanceOf(ValidationError);
    expect(await reportCollabPost(created.id, "inaccurate", "1.1.1.1")).toEqual({ hidden: false, duplicate: false });
    expect((await reportCollabPost(created.id, "inaccurate", "1.1.1.1")).duplicate).toBe(true);
    await reportCollabPost(created.id, "advertising", "2.2.2.2");
    expect((await reportCollabPost(created.id, "inappropriate", "3.3.3.3")).hidden).toBe(true);
    expect(await listCollabPosts()).toHaveLength(0);
    const stored = await (await db()).collabReport.findMany();
    expect(stored.every((r) => !r.reporterKey.includes("1.1.1.1"))).toBe(true);

    await reviewCollabPost(reviewer, created.id, "DISMISS_REPORTS");
    expect(await listCollabPosts()).toHaveLength(1);

    await closeCollabPost(owner, created.id);
    expect(await listCollabPosts()).toHaveLength(0);
  });

  it("staff can post for a ministry without a church listing; it publishes immediately", async () => {
    const reviewer = await actorFor("reviewer@test.invalid", "REVIEWER");
    await expect(submitCollabPost(reviewer, { ...post(""), churchId: "" })).rejects.toBeInstanceOf(ValidationError);
    const created = await submitCollabPost(reviewer, { ...post(""), churchId: "", organizationName: "Campus Ministry" });
    expect(created.status).toBe("APPROVED");
    expect((await listCollabPosts()).map((p) => p.organizationName)).toEqual(["Campus Ministry"]);
  });
});

describe("photo gallery", () => {
  beforeEach(resetDatabase);

  it("requires credit and permission, rejects uploads for free listings, and caps the gallery", async () => {
    const { church, owner } = await churchWithOwner();
    const base = { imageUrl: "https://church.test/sanctuary.jpg", credit: "Church staff", permission: "Our own photo" };
    await expect(addGalleryPhoto(owner, church.id, { ...base, credit: "" })).rejects.toBeInstanceOf(ValidationError);
    await expect(addGalleryPhoto(owner, church.id, { ...base, imageUrl: "http://church.test/x.jpg" })).rejects.toBeInstanceOf(ValidationError);
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "a.jpg", { type: "image/jpeg" });
    await expect(addGalleryPhoto(owner, church.id, { ...base, file })).rejects.toBeInstanceOf(ForbiddenError);
    const stranger = await actorFor("stranger@test.invalid");
    await expect(addGalleryPhoto(stranger, church.id, base)).rejects.toBeInstanceOf(ForbiddenError);

    for (let i = 0; i < MAX_GALLERY_PHOTOS; i += 1) await addGalleryPhoto(owner, church.id, { ...base, caption: `Photo ${i}` });
    await expect(addGalleryPhoto(owner, church.id, base)).rejects.toBeInstanceOf(ValidationError);
    const photos = await listGalleryPhotos(church.id);
    expect(photos.map((p) => p.caption)).toEqual(Array.from({ length: MAX_GALLERY_PHOTOS }, (_, i) => `Photo ${i}`));

    await removeGalleryPhoto(owner, photos[0].id);
    expect(await listGalleryPhotos(church.id)).toHaveLength(MAX_GALLERY_PHOTOS - 1);
  });
});
