import { prisma } from "@/lib/prisma/client";
import {
  AdminUserRecord,
  AuditLogRecord,
  ChurchMembershipRecord,
  ClaimRequestRecord,
  SiteContentRecord
} from "@/lib/types";
import { churches, submissions, suggestedChanges } from "@/lib/data/mock";
import {
  adminUsers as fallbackAdminUsers,
  auditLogs as fallbackAuditLogs,
  churchMemberships as fallbackChurchMemberships,
  claimRequests as fallbackClaimRequests,
  siteContent as fallbackSiteContent
} from "@/lib/data/access";

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

async function withFallback<T>(loader: () => Promise<T>, fallback: T): Promise<T> {
  if (!hasDatabaseUrl()) {
    return fallback;
  }

  try {
    return await loader();
  } catch (error) {
    console.error("DB fallback activated", error);
    return fallback;
  }
}

function mapClaimRequest(record: {
  id: string;
  applicantName: string;
  applicantEmail: string;
  applicantRole: string;
  verificationMethod: string;
  evidenceSummary: string;
  status: string;
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewerNote: string | null;
  church: { slug: string; name: string };
}): ClaimRequestRecord {
  return {
    id: record.id,
    churchSlug: record.church.slug,
    churchName: record.church.name,
    applicantName: record.applicantName,
    applicantEmail: record.applicantEmail,
    applicantRole: record.applicantRole,
    verificationMethod: record.verificationMethod as ClaimRequestRecord["verificationMethod"],
    evidenceSummary: record.evidenceSummary,
    status: record.status as ClaimRequestRecord["status"],
    submittedAt: record.submittedAt.toISOString(),
    reviewedAt: record.reviewedAt?.toISOString(),
    reviewerNote: record.reviewerNote ?? undefined
  };
}

function mapMembership(record: {
  id: string;
  role: string;
  status: string;
  grantedAt: Date | null;
  church: { slug: string; name: string };
  user: { email: string; name: string | null };
}): ChurchMembershipRecord {
  return {
    id: record.id,
    churchSlug: record.church.slug,
    churchName: record.church.name,
    userEmail: record.user.email,
    userName: record.user.name ?? record.user.email,
    role: record.role as ChurchMembershipRecord["role"],
    status: record.status as ChurchMembershipRecord["status"],
    grantedAt: (record.grantedAt ?? new Date()).toISOString()
  };
}

function mapUser(record: {
  id: string;
  name: string | null;
  email: string;
  role: string;
  memberships: Array<{ church: { slug: string } }>;
}): AdminUserRecord {
  return {
    id: record.id,
    name: record.name ?? record.email,
    email: record.email,
    role: record.role as AdminUserRecord["role"],
    status: "ACTIVE",
    churchSlugs: record.memberships.map((membership) => membership.church.slug)
  };
}

function mapSiteContent(record: {
  id: string;
  key: string;
  label: string;
  value: string;
  area: string;
  updatedAt: Date;
}): SiteContentRecord {
  return {
    id: record.id,
    key: record.key,
    label: record.label,
    value: record.value,
    area: record.area as SiteContentRecord["area"],
    updatedAt: record.updatedAt.toISOString()
  };
}

export async function getPersistedClaimRequests() {
  return withFallback(
    async () => {
      const records = await prisma.claimRequest.findMany({
        include: {
          church: {
            select: {
              slug: true,
              name: true
            }
          }
        },
        orderBy: {
          submittedAt: "desc"
        }
      });

      return records.map(mapClaimRequest);
    },
    fallbackClaimRequests
  );
}

export async function getPersistedClaimRequestByChurchSlug(churchSlug: string) {
  const claims = await getPersistedClaimRequests();
  return claims.find((claim) => claim.churchSlug === churchSlug);
}

export async function getPersistedMembershipsByEmail(email: string) {
  return withFallback(
    async () => {
      const records = await prisma.churchMembership.findMany({
        where: {
          user: {
            email: email.toLowerCase()
          }
        },
        include: {
          church: {
            select: {
              slug: true,
              name: true
            }
          },
          user: {
            select: {
              email: true,
              name: true
            }
          }
        }
      });

      return records.map(mapMembership);
    },
    fallbackChurchMemberships.filter((membership) => membership.userEmail.toLowerCase() === email.toLowerCase())
  );
}

export async function getPersistedMembershipsByChurchSlug(churchSlug: string) {
  return withFallback(
    async () => {
      const records = await prisma.churchMembership.findMany({
        where: {
          church: {
            slug: churchSlug
          }
        },
        include: {
          church: {
            select: {
              slug: true,
              name: true
            }
          },
          user: {
            select: {
              email: true,
              name: true
            }
          }
        }
      });

      return records.map(mapMembership);
    },
    fallbackChurchMemberships.filter((membership) => membership.churchSlug === churchSlug)
  );
}

export async function getPersistedAdminUsers() {
  return withFallback(
    async () => {
      const records = await prisma.user.findMany({
        include: {
          memberships: {
            include: {
              church: {
                select: {
                  slug: true
                }
              }
            }
          }
        },
        orderBy: {
          email: "asc"
        }
      });

      return records.map(mapUser);
    },
    fallbackAdminUsers
  );
}

export async function getPersistedSiteContent() {
  return withFallback(
    async () => {
      const records = await prisma.siteContent.findMany({
        orderBy: [{ area: "asc" }, { key: "asc" }]
      });

      return records.map(mapSiteContent);
    },
    fallbackSiteContent
  );
}

export async function saveSiteContentRecord(input: {
  id?: string;
  key: string;
  label: string;
  value: string;
  area: SiteContentRecord["area"];
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  return prisma.siteContent.upsert({
    where: {
      key: input.key
    },
    update: {
      label: input.label,
      value: input.value,
      area: input.area
    },
    create: {
      key: input.key,
      label: input.label,
      value: input.value,
      area: input.area
    }
  });
}

export async function createPersistedClaimRequest(input: {
  churchSlug?: string;
  churchName: string;
  contactName: string;
  contactEmail: string;
  role: string;
  verificationMethod: ClaimRequestRecord["verificationMethod"];
  evidence: string;
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  const church = input.churchSlug
    ? await prisma.church.findUnique({ where: { slug: input.churchSlug } })
    : await prisma.church.findFirst({ where: { name: input.churchName } });

  if (!church) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      email: input.contactEmail.toLowerCase()
    }
  });

  return prisma.claimRequest.create({
    data: {
      churchId: church.id,
      userId: user?.id,
      applicantName: input.contactName,
      applicantEmail: input.contactEmail.toLowerCase(),
      applicantRole: input.role,
      verificationMethod: input.verificationMethod,
      evidenceSummary: input.evidence
    }
  });
}

export async function reviewPersistedClaimRequest(input: {
  claimId: string;
  decision: "APPROVED" | "MORE_INFO" | "DENIED";
  reviewerNote?: string;
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  const claim = await prisma.claimRequest.update({
    where: {
      id: input.claimId
    },
    data: {
      status: input.decision,
      reviewerNote: input.reviewerNote,
      reviewedAt: new Date()
    },
    include: {
      church: true,
      user: true
    }
  });

  if (input.decision === "APPROVED") {
    const user =
      claim.user ??
      (await prisma.user.upsert({
        where: {
          email: claim.applicantEmail
        },
        update: {
          name: claim.applicantName,
          role: "CHURCH_OWNER"
        },
        create: {
          email: claim.applicantEmail,
          name: claim.applicantName,
          role: "CHURCH_OWNER"
        }
      }));

    await prisma.church.update({
      where: {
        id: claim.churchId
      },
      data: {
        claimed: true
      }
    });

    await prisma.churchMembership.upsert({
      where: {
        churchId_userId: {
          churchId: claim.churchId,
          userId: user.id
        }
      },
      update: {
        role: "CHURCH_OWNER",
        status: "ACTIVE",
        grantedAt: new Date()
      },
      create: {
        churchId: claim.churchId,
        userId: user.id,
        role: "CHURCH_OWNER",
        status: "ACTIVE",
        grantedAt: new Date()
      }
    });
  }

  return claim;
}

export async function getPersistedAuditLogs() {
  return Promise.resolve(fallbackAuditLogs as AuditLogRecord[]);
}

export async function getPersistedAdminStats() {
  return withFallback(
    async () => {
      const [
        churches,
        verified,
        claimed,
        pendingChanges,
        pendingSubmissions,
        pendingClaims,
        churchOwners
      ] = await Promise.all([
        prisma.church.count(),
        prisma.church.count({ where: { verified: true } }),
        prisma.church.count({ where: { claimed: true } }),
        prisma.suggestedChange.count({ where: { status: "PENDING" } }),
        prisma.submission.count({ where: { status: "PENDING" } }),
        prisma.claimRequest.count({ where: { status: "PENDING" } }),
        prisma.churchMembership.count({ where: { role: "CHURCH_OWNER", status: "ACTIVE" } })
      ]);

      return {
        churches,
        verified,
        claimed,
        pendingChanges,
        pendingSubmissions,
        pendingClaims,
        churchOwners
      };
    },
    {
      churches: churches.length,
      verified: churches.filter((church) => church.verified).length,
      claimed: churches.filter((church) => church.claimed).length,
      pendingChanges: suggestedChanges.filter((change) => change.status === "PENDING").length,
      pendingSubmissions: submissions.filter((submission) => submission.status === "PENDING").length,
      pendingClaims: fallbackClaimRequests.filter((claim) => claim.status === "PENDING").length,
      churchOwners: fallbackChurchMemberships.filter((membership) => membership.role === "CHURCH_OWNER" && membership.status === "ACTIVE").length
    }
  );
}

export async function getPersistedUnclaimedChurches() {
  return withFallback(
    async () => {
      const records = await prisma.church.findMany({
        where: {
          claimed: false
        },
        orderBy: [{ city: "asc" }, { name: "asc" }],
        take: 6
      });

      return records.map((record) => ({
        id: record.id,
        name: record.name,
        city: record.city
      }));
    },
    churches.filter((church) => !church.claimed).slice(0, 6).map((church) => ({
      id: church.id,
      name: church.name,
      city: church.city
    }))
  );
}

export async function getPersistedListingsNeedingRefresh() {
  return withFallback(
    async () => {
      const records = await prisma.church.findMany({
        orderBy: {
          lastUpdatedAt: "asc"
        },
        take: 6
      });

      return records.map((record) => ({
        id: record.id,
        name: record.name,
        lastUpdatedAt: (record.lastUpdatedAt ?? record.updatedAt).toISOString()
      }));
    },
    [...churches]
      .sort((a, b) => new Date(a.lastUpdatedAt).getTime() - new Date(b.lastUpdatedAt).getTime())
      .slice(0, 6)
      .map((church) => ({
        id: church.id,
        name: church.name,
        lastUpdatedAt: church.lastUpdatedAt
      }))
  );
}
