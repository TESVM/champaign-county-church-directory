-- Paid visitor-facing profile enhancements. Core church discovery information
-- remains public for every listing.
ALTER TABLE "Church"
ADD COLUMN "premiumProfile" BOOLEAN NOT NULL DEFAULT false;
