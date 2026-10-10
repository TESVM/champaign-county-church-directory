-- CreateEnum
CREATE TYPE "ChurchStatus" AS ENUM ('ACTIVE', 'CLOSED', 'MERGED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('NEW_LISTING');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InboxStatus" AS ENUM ('NEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ChangeSource" AS ENUM ('SCANNER', 'VISITOR', 'CHURCH', 'ADMIN');

-- CreateEnum
CREATE TYPE "WebsiteCheckOutcome" AS ENUM ('OK', 'HTTP_ERROR', 'NETWORK_ERROR', 'TIMEOUT', 'TOO_LARGE', 'NOT_HTML', 'BLOCKED_BY_ROBOTS', 'SKIPPED_PLATFORM', 'INVALID_URL');

-- CreateEnum
CREATE TYPE "EventRecurrence" AS ENUM ('NONE', 'WEEKLY');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ResourceCategory" AS ENUM ('FOOD_PANTRY', 'CLOTHING', 'SUPPORT_GROUP', 'COMMUNITY_MEAL', 'FINANCIAL_HELP', 'TUTORING', 'HEALTH', 'OTHER');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED', 'LOGGED');

-- AlterTable
ALTER TABLE "Church" ADD COLUMN     "appStoreUrl" TEXT,
ADD COLUMN     "complimentaryPremiumReason" TEXT,
ADD COLUMN     "complimentaryPremiumUntil" TIMESTAMP(3),
ADD COLUMN     "featuredImageCredit" TEXT,
ADD COLUMN     "featuredImagePermission" TEXT,
ADD COLUMN     "featuredImageSourceUrl" TEXT,
ADD COLUMN     "googlePlayUrl" TEXT,
ADD COLUMN     "importedSourceUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "leadershipConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "leadershipConfirmedBy" TEXT,
ADD COLUMN     "mergedIntoId" TEXT,
ADD COLUMN     "publicSourceCheckedAt" TIMESTAMP(3),
ADD COLUMN     "publicSourceUrl" TEXT,
ADD COLUMN     "status" "ChurchStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "statusNote" TEXT;

-- AlterTable
ALTER TABLE "ChurchMembership" ADD COLUMN     "grantedBy" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "revokedBy" TEXT;

-- AlterTable
ALTER TABLE "City" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "ClaimRequest" ADD COLUMN     "applicantPhone" TEXT,
ADD COLUMN     "emailDomainMatches" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewedBy" TEXT;

-- AlterTable
ALTER TABLE "ServiceTime" ADD COLUMN     "language" TEXT,
ADD COLUMN     "startMinutes" INTEGER;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "createdChurchId" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "reviewerNote" TEXT,
ADD COLUMN     "type" "SubmissionType" NOT NULL DEFAULT 'NEW_LISTING';

-- AlterTable
ALTER TABLE "SuggestedChange" ADD COLUMN     "evidence" TEXT,
ADD COLUMN     "reviewerNote" TEXT,
ADD COLUMN     "source" "ChangeSource" NOT NULL DEFAULT 'ADMIN',
ADD COLUMN     "websiteCheckId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "disabledAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "churchId" TEXT,
    "summary" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organization" TEXT,
    "message" TEXT NOT NULL,
    "status" "InboxStatus" NOT NULL DEFAULT 'NEW',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectionReport" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "fieldName" TEXT,
    "details" TEXT NOT NULL,
    "reporterName" TEXT,
    "reporterEmail" TEXT,
    "status" "InboxStatus" NOT NULL DEFAULT 'NEW',
    "reviewerNote" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorrectionReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorGuide" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "parking" TEXT,
    "entrance" TEXT,
    "accessibility" TEXT,
    "wheelchairAccessible" BOOLEAN,
    "hearingAssistance" BOOLEAN,
    "childrenCheckIn" TEXT,
    "hasChildrenProgram" BOOLEAN,
    "serviceLength" TEXT,
    "dress" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whatToExpect" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitorGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startDate" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "recurrence" "EventRecurrence" NOT NULL DEFAULT 'NONE',
    "recurrenceUntil" TEXT,
    "registrationUrl" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityResource" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "category" "ResourceCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "schedule" TEXT,
    "eligibility" TEXT,
    "contact" TEXT,
    "url" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "status" TEXT NOT NULL,
    "priceId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "lastEventCreated" INTEGER NOT NULL DEFAULT 0,
    "lastEventId" TEXT,
    "startedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created" INTEGER NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "error" TEXT,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityDaily" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ActivityDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteCheck" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "finalUrl" TEXT,
    "outcome" "WebsiteCheckOutcome" NOT NULL,
    "httpStatus" INTEGER,
    "error" TEXT,
    "contentHash" TEXT,
    "proposals" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "WebsiteCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "windowStart" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateTable
CREATE TABLE "OutboundEmail" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "provider" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL,
    "providerId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboundEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "LoginToken_email_idx" ON "LoginToken"("email");

-- CreateIndex
CREATE INDEX "AuditLog_churchId_idx" ON "AuditLog"("churchId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ContactMessage_status_idx" ON "ContactMessage"("status");

-- CreateIndex
CREATE INDEX "CorrectionReport_churchId_idx" ON "CorrectionReport"("churchId");

-- CreateIndex
CREATE INDEX "CorrectionReport_status_idx" ON "CorrectionReport"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VisitorGuide_churchId_key" ON "VisitorGuide"("churchId");

-- CreateIndex
CREATE INDEX "Event_churchId_idx" ON "Event"("churchId");

-- CreateIndex
CREATE INDEX "Event_startsAt_idx" ON "Event"("startsAt");

-- CreateIndex
CREATE INDEX "CommunityResource_churchId_idx" ON "CommunityResource"("churchId");

-- CreateIndex
CREATE INDEX "CommunityResource_status_category_idx" ON "CommunityResource"("status", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_churchId_key" ON "Subscription"("churchId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "ActivityDaily_churchId_day_idx" ON "ActivityDaily"("churchId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityDaily_churchId_day_metric_key" ON "ActivityDaily"("churchId", "day", "metric");

-- CreateIndex
CREATE INDEX "WebsiteCheck_churchId_startedAt_idx" ON "WebsiteCheck"("churchId", "startedAt");

-- CreateIndex
CREATE INDEX "OutboundEmail_createdAt_idx" ON "OutboundEmail"("createdAt");

-- CreateIndex
CREATE INDEX "Church_status_idx" ON "Church"("status");

-- CreateIndex
CREATE INDEX "ServiceTime_dayOfWeek_idx" ON "ServiceTime"("dayOfWeek");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionReport" ADD CONSTRAINT "CorrectionReport_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorGuide" ADD CONSTRAINT "VisitorGuide_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityResource" ADD CONSTRAINT "CommunityResource_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityDaily" ADD CONSTRAINT "ActivityDaily_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteCheck" ADD CONSTRAINT "WebsiteCheck_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Data migration (hand-written; safe to run on a database with live data)
-- ---------------------------------------------------------------------------

-- A listing previously marked `verified` had been checked against a public
-- source by the research team, not confirmed by church leadership. Record it as
-- such, dated at the record's last update, so the public label stays truthful.
UPDATE "Church"
SET "publicSourceCheckedAt" = COALESCE("lastUpdatedAt", "updatedAt"),
    "publicSourceUrl" = COALESCE("publicSourceUrl", "websiteUrl")
WHERE "verified" = true AND "publicSourceCheckedAt" IS NULL;

-- Profiles flagged premium before billing existed were set by hand. Convert
-- them to an explicit complimentary grant (no end date) so the entitlement is
-- visible and revocable in the admin screen rather than an unexplained flag.
UPDATE "Church"
SET "complimentaryPremiumReason" = 'Enhanced profile enabled manually before billing launched',
    "complimentaryPremiumUntil" = TIMESTAMP '2099-12-31 00:00:00'
WHERE "premiumProfile" = true AND "complimentaryPremiumReason" IS NULL;

INSERT INTO "AuditLog" ("id", "action", "entityType", "entityId", "churchId", "summary", "createdAt")
SELECT 'mig-premium-' || "id", 'billing.complimentary_migrated', 'Church', "id", "id",
       'Pre-billing premium flag converted to a complimentary enhanced profile', CURRENT_TIMESTAMP
FROM "Church" WHERE "premiumProfile" = true;
