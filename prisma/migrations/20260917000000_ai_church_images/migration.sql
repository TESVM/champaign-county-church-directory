-- CreateEnum
CREATE TYPE "AiImageStatus" AS ENUM ('NONE', 'PENDING', 'GENERATED', 'FAILED');

-- AlterTable
ALTER TABLE "Church" ADD COLUMN     "aiImageError" TEXT,
ADD COLUMN     "aiImageRequestedAt" TIMESTAMP(3),
ADD COLUMN     "aiImageStatus" "AiImageStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "featuredImageIsAi" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "featuredImageModel" TEXT;

