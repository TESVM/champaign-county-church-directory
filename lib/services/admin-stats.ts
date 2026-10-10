import { db } from "@/lib/db";

export async function adminQueueCounts() {
  const prisma = await db();
  const [claims, submissions, contacts, corrections, changes, resources] = await Promise.all([
    prisma.claimRequest.count({ where: { status: "PENDING" } }),
    prisma.submission.count({ where: { status: "PENDING" } }),
    prisma.contactMessage.count({ where: { status: "NEW" } }),
    prisma.correctionReport.count({ where: { status: "NEW" } }),
    prisma.suggestedChange.count({ where: { status: "PENDING" } }),
    prisma.communityResource.count({ where: { status: "PENDING" } })
  ]);
  return { claims, submissions, inbox: contacts + corrections, changes, resources };
}

export async function adminOverview() {
  const prisma = await db();
  const [active, closed, hidden, sourceChecked, leadership, claimed, withPhoto, enhancedSubs, complimentary, stale] = await Promise.all([
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
    })
  ]);
  return { active, closed, hidden, sourceChecked, leadership, claimed, withPhoto, enhancedSubs, complimentary, stale };
}
