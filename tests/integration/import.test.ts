import { beforeEach, describe, expect, it } from "vitest";
import { countyCities, churches as allRecords } from "@/lib/data/mock";
import { getPublishedChurches } from "@/lib/data/published";
import { db } from "@/lib/db";
import { runChurchImport } from "@/lib/import/church-import";
import { resetDatabase } from "./helpers";

describe("church import", () => {
  beforeEach(resetDatabase);

  it("imports every real record, never the fixtures, and is idempotent", async () => {
    const prisma = await db();
    const published = getPublishedChurches();
    const first = await runChurchImport(prisma, published, countyCities, { apply: true });
    expect(first.plan.every((p) => p.action === "create")).toBe(true);
    expect(await prisma.church.count()).toBe(published.length);

    const fixtureSlugs = allRecords.filter((c) => c.isFixture).map((c) => c.slug);
    expect(fixtureSlugs.length).toBeGreaterThan(0);
    expect(await prisma.church.count({ where: { slug: { in: fixtureSlugs } } })).toBe(0);
    expect(await prisma.church.count({ where: { OR: [{ websiteUrl: { contains: ".example" } }, { phone: { contains: "555-01" } }] } })).toBe(0);

    const second = await runChurchImport(prisma, published, countyCities, { apply: true });
    expect(second.plan.filter((p) => p.action !== "skip")).toEqual([]);
    expect(await prisma.church.count()).toBe(published.length);
  });

  it("keeps App Store, Google Play, livestream and social links as separate fields", async () => {
    const prisma = await db();
    await runChurchImport(prisma, getPublishedChurches(), countyCities, { apply: true });
    const staoh = await prisma.church.findUniqueOrThrow({ where: { slug: "sheriff-temple-aoh-church-of-god" }, include: { socialLinks: true } });
    expect(staoh.appStoreUrl).toBe("https://apps.apple.com/us/app/staoh/id6759809684");
    expect(staoh.googlePlayUrl).toBe("https://play.google.com/store/apps/details?id=com.finalweb.fwapp_180010939");
    expect(staoh.livestreamUrl).toBe("https://www.staoh.com/");
    expect(staoh.socialLinks.map((l) => l.platform)).toEqual(["facebook"]);
    // The static preview flag is not an entitlement and is never imported as one.
    expect(staoh.complimentaryPremiumUntil).toBeNull();
  });

  it("records image provenance and never treats a placeholder pastor as a person", async () => {
    const prisma = await db();
    await runChurchImport(prisma, getPublishedChurches(), countyCities, { apply: true });
    const withImage = await prisma.church.findFirstOrThrow({ where: { featuredImageUrl: { startsWith: "/churches/" } } });
    expect(withImage.featuredImageSourceUrl).toMatch(/^https:\/\//);
    expect(withImage.featuredImagePermission).toBeTruthy();
    expect(await prisma.pastor.count({ where: { fullName: { contains: "not publicly listed" } } })).toBe(0);
  });

  it("never overwrites a church edited in the database or confirmed by its leadership", async () => {
    const prisma = await db();
    const published = getPublishedChurches();
    await runChurchImport(prisma, published, countyCities, { apply: true });
    const [edited, confirmed] = published.slice(0, 2);
    await prisma.church.update({ where: { slug: edited.slug }, data: { phone: "(217) 555-9999", lastUpdatedAt: new Date() } });
    await prisma.church.update({ where: { slug: confirmed.slug }, data: { leadershipConfirmedAt: new Date() } });

    // A newer file record for both must still not overwrite them.
    const newer = published.map((c) => (c.slug === edited.slug || c.slug === confirmed.slug ? { ...c, lastUpdatedAt: "2030-01-01T00:00:00.000Z", phone: "(217) 555-0000" } : c));
    const { plan } = await runChurchImport(prisma, newer, countyCities, { apply: true });
    expect(plan.find((p) => p.slug === edited.slug)).toMatchObject({ action: "skip", reason: "database has newer edits" });
    expect(plan.find((p) => p.slug === confirmed.slug)).toMatchObject({ action: "skip" });
    expect((await prisma.church.findUniqueOrThrow({ where: { slug: edited.slug } })).phone).toBe("(217) 555-9999");
  });

  it("dry run writes nothing", async () => {
    const prisma = await db();
    const { plan, applied } = await runChurchImport(prisma, getPublishedChurches(), countyCities, { apply: false });
    expect(applied).toBe(false);
    expect(plan.length).toBeGreaterThan(50);
    expect(await prisma.church.count()).toBe(0);
  });
});
