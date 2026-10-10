-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "CampusOrganization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "campuses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "affiliation" TEXT,
    "churchId" TEXT,
    "description" TEXT NOT NULL,
    "whoIsWelcome" TEXT,
    "meetingDay" TEXT,
    "meetingTime" TEXT,
    "meetingLocation" TEXT,
    "meetingTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "firstTimeNote" TEXT,
    "accessibilityNote" TEXT,
    "websiteUrl" TEXT,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "otherSocialUrl" TEXT,
    "registrationUrl" TEXT,
    "logoUrl" TEXT,
    "publicContactName" TEXT,
    "publicContactRole" TEXT,
    "publicContactEmail" TEXT,
    "publishContact" BOOLEAN NOT NULL DEFAULT false,
    "submitterName" TEXT,
    "submitterRole" TEXT,
    "submitterEmail" TEXT,
    "consentToPublish" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'organization',
    "sourceUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampusOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampusEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "churchId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startDate" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "recurrence" "EventRecurrence" NOT NULL DEFAULT 'NONE',
    "recurrenceUntil" TEXT,
    "campuses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "registrationUrl" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submitterName" TEXT,
    "submitterEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampusOrganization_slug_key" ON "CampusOrganization"("slug");

-- CreateIndex
CREATE INDEX "CampusOrganization_status_idx" ON "CampusOrganization"("status");

-- CreateIndex
CREATE INDEX "CampusEvent_status_startsAt_idx" ON "CampusEvent"("status", "startsAt");

-- AddForeignKey
ALTER TABLE "CampusOrganization" ADD CONSTRAINT "CampusOrganization_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampusEvent" ADD CONSTRAINT "CampusEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "CampusOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampusEvent" ADD CONSTRAINT "CampusEvent_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Church" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "studentTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "studentTagsSource" TEXT,
ADD COLUMN     "studentTagsUpdatedAt" TIMESTAMP(3);

