import { z } from "zod";
import { type Actor, assertCanEditChurch, isStaff } from "@/lib/actor";
import { db } from "@/lib/db";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { featureVisible } from "@/lib/plans";
import { computeEntitlement } from "@/lib/services/entitlements";
import { StorageError, storeUploadedImage } from "@/lib/media";
import { audit } from "@/lib/services/audit";
import { LinkError, normalizeLink } from "@/lib/validation/links";

/**
 * Church photographs. Every image needs a stated source and permission basis,
 * because the directory must not present someone else's building, a stock
 * photo, or an AI image as a congregation's own.
 */

const provenanceSchema = z.object({
  credit: z.string().trim().min(2, "Say who took or published the photo.").max(200),
  permission: z.string().trim().min(5, "Explain why we may use it, e.g. “Our own photo” or “Published on our website”.").max(500)
});

export const UPLOAD_REQUIRES_ENHANCED =
  "Uploading photos is part of the Enhanced Church Profile. Paste an image link instead.";

/** Whether this actor may upload files (rather than link images) for this church. */
export async function canUploadPhotos(actor: Actor, churchId: string) {
  if (isStaff(actor)) return true;
  const prisma = await db();
  const church = await prisma.church.findUnique({
    where: { id: churchId },
    select: { complimentaryPremiumUntil: true, subscription: { select: { status: true, currentPeriodEnd: true } } }
  });
  if (!church) return false;
  const entitled = computeEntitlement({ complimentaryPremiumUntil: church.complimentaryPremiumUntil, subscription: church.subscription }).active;
  return featureVisible("photoUploads", entitled);
}

export async function saveChurchPhoto(
  actor: Actor,
  churchId: string,
  input: { file?: File | null; imageUrl?: unknown; sourceUrl?: unknown; credit?: unknown; permission?: unknown }
) {
  assertCanEditChurch(actor, churchId);
  const prisma = await db();
  const church = await prisma.church.findUniqueOrThrow({ where: { id: churchId } });

  const hasFile = input.file instanceof File && input.file.size > 0;
  if (hasFile && !(await canUploadPhotos(actor, churchId))) throw new ForbiddenError(UPLOAD_REQUIRES_ENHANCED);
  let imageUrl: string | null = null;
  const fieldErrors: Record<string, string> = {};
  if (!hasFile) {
    try {
      imageUrl = normalizeLink(input.imageUrl, "image");
    } catch (error) {
      fieldErrors.imageUrl = (error as LinkError).message;
    }
    if (!imageUrl && !fieldErrors.imageUrl) fieldErrors.imageUrl = "Upload a photo or paste an image link.";
    if (imageUrl && imageUrl.startsWith("http:")) fieldErrors.imageUrl = "Image links must use https://.";
  }

  const provenance = provenanceSchema.safeParse({ credit: input.credit ?? "", permission: input.permission ?? "" });
  if (!provenance.success) for (const issue of provenance.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;

  let sourceUrl: string | null = null;
  try {
    sourceUrl = normalizeLink(input.sourceUrl, "website");
  } catch (error) {
    fieldErrors.sourceUrl = (error as LinkError).message;
  }

  if (Object.keys(fieldErrors).length || !provenance.success) {
    throw new ValidationError("Please fix the highlighted fields. The photo was not saved.", fieldErrors);
  }

  if (hasFile) {
    try {
      imageUrl = await storeUploadedImage(input.file as File, church.slug);
    } catch (error) {
      if (error instanceof StorageError) throw new ValidationError(error.message, { file: error.message });
      throw error;
    }
  }

  await prisma.church.update({
    where: { id: churchId },
    data: {
      featuredImageUrl: imageUrl,
      featuredImageIsAi: false,
      featuredImageModel: null,
      aiImageStatus: "NONE",
      aiImageError: null,
      featuredImageCredit: provenance.data.credit,
      featuredImagePermission: provenance.data.permission,
      featuredImageSourceUrl: sourceUrl ?? (hasFile ? null : imageUrl),
      lastUpdatedAt: new Date()
    }
  });
  await audit(actor, {
    action: "church.photo_replaced",
    entityType: "Church",
    entityId: churchId,
    churchId,
    summary: `Replaced photo (${provenance.data.credit})`,
    details: { previous: church.featuredImageUrl, permission: provenance.data.permission }
  });
}

export async function removeChurchPhoto(actor: Actor, churchId: string) {
  assertCanEditChurch(actor, churchId);
  const prisma = await db();
  const church = await prisma.church.findUniqueOrThrow({ where: { id: churchId } });
  await prisma.church.update({
    where: { id: churchId },
    data: {
      featuredImageUrl: null,
      featuredImageIsAi: false,
      featuredImageCredit: null,
      featuredImagePermission: null,
      featuredImageSourceUrl: null,
      lastUpdatedAt: new Date()
    }
  });
  await audit(actor, { action: "church.photo_removed", entityType: "Church", entityId: churchId, churchId, summary: "Removed photo; placeholder shown", details: { previous: church.featuredImageUrl } });
}

/**
 * Lead pastor's photo. Enhanced profiles (and staff) may upload; free listings
 * link an image. Credit and permission are required and kept in the audit log.
 */
export async function savePastorPhoto(
  actor: Actor,
  churchId: string,
  input: { file?: File | null; imageUrl?: unknown; credit?: unknown; permission?: unknown }
) {
  assertCanEditChurch(actor, churchId);
  const prisma = await db();
  const church = await prisma.church.findUniqueOrThrow({ where: { id: churchId }, include: { seniorPastor: true } });
  if (!church.seniorPastor) {
    throw new ValidationError("Add the lead pastor's name on the Listing tab first.");
  }

  const hasFile = input.file instanceof File && input.file.size > 0;
  if (hasFile && !(await canUploadPhotos(actor, churchId))) throw new ForbiddenError(UPLOAD_REQUIRES_ENHANCED);

  const fieldErrors: Record<string, string> = {};
  let imageUrl: string | null = null;
  if (!hasFile) {
    try {
      imageUrl = normalizeLink(input.imageUrl, "image");
    } catch (error) {
      fieldErrors.pastorImageUrl = (error as LinkError).message;
    }
    if (!imageUrl && !fieldErrors.pastorImageUrl) fieldErrors.pastorImageUrl = "Upload a photo or paste an image link.";
    if (imageUrl?.startsWith("http:")) fieldErrors.pastorImageUrl = "Image links must use https://.";
  }
  const provenance = provenanceSchema.safeParse({ credit: input.credit ?? "", permission: input.permission ?? "" });
  if (!provenance.success) for (const issue of provenance.error.issues) fieldErrors[`pastor_${String(issue.path[0])}`] ??= issue.message;
  if (Object.keys(fieldErrors).length || !provenance.success) {
    throw new ValidationError("Please fix the highlighted fields. The pastor photo was not saved.", fieldErrors);
  }

  if (hasFile) {
    try {
      imageUrl = await storeUploadedImage(input.file as File, `${church.slug}-pastor`);
    } catch (error) {
      if (error instanceof StorageError) throw new ValidationError(error.message, { pastorFile: error.message });
      throw error;
    }
  }

  await prisma.pastor.update({ where: { id: church.seniorPastor.id }, data: { photoUrl: imageUrl } });
  await prisma.church.update({ where: { id: churchId }, data: { lastUpdatedAt: new Date() } });
  await audit(actor, {
    action: "church.pastor_photo_replaced",
    entityType: "Pastor",
    entityId: church.seniorPastor.id,
    churchId,
    summary: `Set photo of ${church.seniorPastor.fullName} (${provenance.data.credit})`,
    details: { previous: church.seniorPastor.photoUrl, credit: provenance.data.credit, permission: provenance.data.permission, uploaded: hasFile }
  });
}

export async function removePastorPhoto(actor: Actor, churchId: string) {
  assertCanEditChurch(actor, churchId);
  const prisma = await db();
  const church = await prisma.church.findUniqueOrThrow({ where: { id: churchId }, include: { seniorPastor: true } });
  if (!church.seniorPastor?.photoUrl) return;
  await prisma.pastor.update({ where: { id: church.seniorPastor.id }, data: { photoUrl: null } });
  await audit(actor, {
    action: "church.pastor_photo_removed",
    entityType: "Pastor",
    entityId: church.seniorPastor.id,
    churchId,
    summary: `Removed photo of ${church.seniorPastor.fullName}`,
    details: { previous: church.seniorPastor.photoUrl }
  });
}
