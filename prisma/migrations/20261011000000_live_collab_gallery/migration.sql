-- AlterTable
ALTER TABLE "Church" ADD COLUMN     "liveMarkedAt" TIMESTAMP(3),
ADD COLUMN     "liveMarkedBy" TEXT,
ADD COLUMN     "liveUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ChurchPhoto" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "credit" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChurchPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollabPost" (
    "id" TEXT NOT NULL,
    "churchId" TEXT,
    "organizationName" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "location" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactUrl" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollabPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollabReport" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reporterKey" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollabReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChurchPhoto_churchId_sortOrder_idx" ON "ChurchPhoto"("churchId", "sortOrder");

-- CreateIndex
CREATE INDEX "CollabPost_status_expiresAt_idx" ON "CollabPost"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "CollabPost_churchId_idx" ON "CollabPost"("churchId");

-- CreateIndex
CREATE UNIQUE INDEX "CollabReport_postId_reporterKey_key" ON "CollabReport"("postId", "reporterKey");

-- AddForeignKey
ALTER TABLE "ChurchPhoto" ADD CONSTRAINT "ChurchPhoto_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollabPost" ADD CONSTRAINT "CollabPost_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollabReport" ADD CONSTRAINT "CollabReport_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CollabPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

