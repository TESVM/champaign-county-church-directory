import { PrismaClient } from "@prisma/client";
import { churches, countyCities } from "@/lib/data/mock";
import { adminUsers, churchMemberships, claimRequests, siteContent } from "@/lib/data/access";

const prisma = new PrismaClient();

async function main() {
  for (const city of countyCities) {
    await prisma.city.upsert({
      where: { slug: city.slug },
      update: {
        name: city.name,
        county: city.county,
        state: city.state
      },
      create: {
        name: city.name,
        slug: city.slug,
        county: city.county,
        state: city.state
      }
    });
  }

  for (const church of churches) {
    const city = await prisma.city.findUniqueOrThrow({
      where: { slug: church.citySlug }
    });

    const seniorPastor = await prisma.pastor.upsert({
      where: { id: `pastor-${church.slug}` },
      update: {
        fullName: church.pastor.fullName,
        title: church.pastor.title,
        bio: church.pastor.bio
      },
      create: {
        id: `pastor-${church.slug}`,
        fullName: church.pastor.fullName,
        title: church.pastor.title,
        bio: church.pastor.bio
      }
    });

    await prisma.church.upsert({
      where: { slug: church.slug },
      update: {
        name: church.name,
        cityId: city.id,
        denomination: church.denomination,
        description: church.description,
        address1: church.address1,
        city: church.city,
        state: church.state,
        zip: church.zip,
        phone: church.phone,
        email: church.email,
        websiteUrl: church.websiteUrl,
        appUrl: church.appUrl,
        livestreamUrl: church.livestreamUrl,
        logoUrl: church.logoUrl,
        featuredImageUrl: church.featuredImageUrl,
        verified: church.verified,
        claimed: church.claimed,
        seniorPastorId: seniorPastor.id,
        lastScannedAt: new Date(church.lastScannedAt),
        lastUpdatedAt: new Date(church.lastUpdatedAt)
      },
      create: {
        name: church.name,
        slug: church.slug,
        cityId: city.id,
        denomination: church.denomination,
        description: church.description,
        address1: church.address1,
        city: church.city,
        state: church.state,
        zip: church.zip,
        phone: church.phone,
        email: church.email,
        websiteUrl: church.websiteUrl,
        appUrl: church.appUrl,
        livestreamUrl: church.livestreamUrl,
        logoUrl: church.logoUrl,
        featuredImageUrl: church.featuredImageUrl,
        verified: church.verified,
        claimed: church.claimed,
        seniorPastorId: seniorPastor.id,
        lastScannedAt: new Date(church.lastScannedAt),
        lastUpdatedAt: new Date(church.lastUpdatedAt)
      }
    });

    const dbChurch = await prisma.church.findUniqueOrThrow({ where: { slug: church.slug } });

    await prisma.serviceTime.deleteMany({ where: { churchId: dbChurch.id } });
    await prisma.socialLink.deleteMany({ where: { churchId: dbChurch.id } });
    await prisma.ministry.deleteMany({ where: { churchId: dbChurch.id } });

    await prisma.serviceTime.createMany({
      data: church.serviceTimes.map((service) => ({
        churchId: dbChurch.id,
        serviceName: service.serviceName,
        dayOfWeek: service.dayOfWeek,
        startTime: service.startTime,
        endTime: service.endTime,
        notes: service.notes
      }))
    });

    await prisma.socialLink.createMany({
      data: church.socialLinks.map((link) => ({
        churchId: dbChurch.id,
        platform: link.platform,
        url: link.url
      }))
    });

    await prisma.ministry.createMany({
      data: church.ministries.map((name) => ({
        churchId: dbChurch.id,
        name
      }))
    });
  }

  for (const user of adminUsers) {
    await prisma.user.upsert({
      where: { email: user.email.toLowerCase() },
      update: {
        name: user.name,
        role: user.role
      },
      create: {
        email: user.email.toLowerCase(),
        name: user.name,
        role: user.role
      }
    });
  }

  for (const membership of churchMemberships) {
    const church = await prisma.church.findUniqueOrThrow({
      where: { slug: membership.churchSlug }
    });

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: membership.userEmail.toLowerCase() }
    });

    await prisma.churchMembership.upsert({
      where: {
        churchId_userId: {
          churchId: church.id,
          userId: user.id
        }
      },
      update: {
        role: membership.role,
        status: membership.status,
        grantedAt: new Date(membership.grantedAt)
      },
      create: {
        churchId: church.id,
        userId: user.id,
        role: membership.role,
        status: membership.status,
        grantedAt: new Date(membership.grantedAt)
      }
    });
  }

  for (const claim of claimRequests) {
    const church = await prisma.church.findUnique({
      where: { slug: claim.churchSlug }
    });

    if (!church) {
      continue;
    }

    const user = await prisma.user.findUnique({
      where: { email: claim.applicantEmail.toLowerCase() }
    });

    await prisma.claimRequest.upsert({
      where: { id: claim.id },
      update: {
        churchId: church.id,
        userId: user?.id,
        applicantName: claim.applicantName,
        applicantEmail: claim.applicantEmail.toLowerCase(),
        applicantRole: claim.applicantRole,
        verificationMethod: claim.verificationMethod,
        evidenceSummary: claim.evidenceSummary,
        status: claim.status,
        reviewerNote: claim.reviewerNote,
        submittedAt: new Date(claim.submittedAt),
        reviewedAt: claim.reviewedAt ? new Date(claim.reviewedAt) : null
      },
      create: {
        id: claim.id,
        churchId: church.id,
        userId: user?.id,
        applicantName: claim.applicantName,
        applicantEmail: claim.applicantEmail.toLowerCase(),
        applicantRole: claim.applicantRole,
        verificationMethod: claim.verificationMethod,
        evidenceSummary: claim.evidenceSummary,
        status: claim.status,
        reviewerNote: claim.reviewerNote,
        submittedAt: new Date(claim.submittedAt),
        reviewedAt: claim.reviewedAt ? new Date(claim.reviewedAt) : null
      }
    });
  }

  for (const item of siteContent) {
    await prisma.siteContent.upsert({
      where: { key: item.key },
      update: {
        label: item.label,
        value: item.value,
        area: item.area
      },
      create: {
        key: item.key,
        label: item.label,
        value: item.value,
        area: item.area
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
