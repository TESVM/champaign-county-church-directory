import { db } from "@/lib/db";

export async function adminQueueCounts() {
  const prisma = await db();
  const [claims, submissions, contacts, corrections, changes, resources, campusOrgs, campusEvents, collab] = await Promise.all([
    prisma.claimRequest.count({ where: { status: "PENDING" } }),
    prisma.submission.count({ where: { status: "PENDING" } }),
    prisma.contactMessage.count({ where: { status: "NEW" } }),
    prisma.correctionReport.count({ where: { status: "NEW" } }),
    prisma.suggestedChange.count({ where: { status: "PENDING" } }),
    prisma.communityResource.count({ where: { status: "PENDING" } }),
    prisma.campusOrganization.count({ where: { status: "PENDING" } }),
    prisma.campusEvent.count({ where: { status: "PENDING" } }),
    prisma.collabPost.count({ where: { OR: [{ status: "PENDING", closedAt: null, expiresAt: { gt: new Date() } }, { reports: { some: { resolvedAt: null } } }] } })
  ]);
  return { claims, submissions, inbox: contacts + corrections, changes, resources, campus: campusOrgs + campusEvents, collab };
}

export async function adminOverview() {
  const prisma = await db();
  const [active, closed, hidden, sourceChecked, leadership, claimed, withPhoto, enhancedSubs, complimentary, stale, unmapped, embeddedChurch, embeddedPastor] = await Promise.all([
    prisma.church.count({ where: { status: "ACTIVE" } }),
    prisma.church.count({ where: { status: "CLOSED" } }),
    prisma.church.count({ where: { status: "HIDDEN" } }),
    prisma.church.count({ where: { status: "ACTIVE", publicSourceCheckedAt: { not: null } } }),
    prisma.church.count({ where: { status: "ACTIVE", leadershipConfirmedAt: { not: null } } }),
    prisma.church.count({ where: { status: "ACTIVE", claimed: true } }),
    prisma.church.count({ where: { status: "ACTIVE", featuredImageUrl: { not: null }, featuredImageIsAi: false } }),
    prisma.subscription.count({ where: { status: { in: ["active", "trialing", "past_due"] } } }),
    prisma.church.count({ where: { complimentaryPremiumUntil: { gt: new Date() } } }),
    prisma.church.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ lastUpdatedAt: { sort: "asc", nulls: "first" } }],
      take: 8,
      select: { slug: true, name: true, lastUpdatedAt: true }
    }),
    prisma.church.count({ where: { status: "ACTIVE", latitude: null } }),
    prisma.church.count({ where: { OR: [{ logoUrl: { startsWith: "data:" } }, { featuredImageUrl: { startsWith: "data:" } }] } }),
    prisma.pastor.count({ where: { photoUrl: { startsWith: "data:" } } }),
  ]);
  return { active, closed, hidden, sourceChecked, leadership, claimed, withPhoto, enhancedSubs, complimentary, stale, unmapped, embedded: embeddedChurch + embeddedPastor };
}
