import { z } from "zod";
import { type Actor, assertCanEditChurch, isStaff } from "@/lib/actor";
import { db } from "@/lib/db";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { featureVisible } from "@/lib/plans";
import { computeEntitlement } from "@/lib/services/entitlements";
import { sniffImageType, StorageError, storeUploadedImage } from "@/lib/media";
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

// ---------------------------------------------------------------------------
// Photo gallery
// ---------------------------------------------------------------------------

export const MAX_GALLERY_PHOTOS = 8;

export async function listGalleryPhotos(churchId: string) {
  const prisma = await db();
  return prisma.churchPhoto.findMany({ where: { churchId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
}

/** Adds a gallery photo: uploads for Enhanced listings, image links for everyone. */
export async function addGalleryPhoto(
  actor: Actor,
  churchId: string,
  input: { file?: File | null; imageUrl?: unknown; caption?: unknown; credit?: unknown; permission?: unknown }
) {
  assertCanEditChurch(actor, churchId);
  const prisma = await db();
  const church = await prisma.church.findUniqueOrThrow({ where: { id: churchId }, select: { slug: true } });
  if ((await prisma.churchPhoto.count({ where: { churchId } })) >= MAX_GALLERY_PHOTOS) {
    throw new ValidationError(`The gallery holds ${MAX_GALLERY_PHOTOS} photos. Remove one to add another.`);
  }
  const hasFile = input.file instanceof File && input.file.size > 0;
  if (hasFile && !(await canUploadPhotos(actor, churchId))) throw new ForbiddenError(UPLOAD_REQUIRES_ENHANCED);
  const fieldErrors: Record<string, string> = {};
  let imageUrl: string | null = null;
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
  const caption = typeof input.caption === "string" ? input.caption.trim().slice(0, 160) || null : null;
  if (Object.keys(fieldErrors).length || !provenance.success) throw new ValidationError("Please fix the highlighted fields. The photo was not added.", fieldErrors);

  if (hasFile) {
    try {
      imageUrl = await storeUploadedImage(input.file as File, `${church.slug}-gallery`);
    } catch (error) {
      if (error instanceof StorageError) throw new ValidationError(error.message, { file: error.message });
      throw error;
    }
  }
  const last = await prisma.churchPhoto.findFirst({ where: { churchId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const photo = await prisma.churchPhoto.create({
    data: { churchId, url: imageUrl!, caption, credit: provenance.data.credit, permission: provenance.data.permission, sortOrder: (last?.sortOrder ?? -1) + 1, createdBy: actor.email }
  });
  await audit(actor, { action: "church.gallery_added", entityType: "ChurchPhoto", entityId: photo.id, churchId, summary: `Added gallery photo (${provenance.data.credit})`, details: { permission: provenance.data.permission, uploaded: hasFile } });
  return photo;
}

export async function removeGalleryPhoto(actor: Actor, photoId: string) {
  const prisma = await db();
  const photo = await prisma.churchPhoto.findUnique({ where: { id: photoId } });
  if (!photo) throw new ValidationError("That photo was already removed.");
  assertCanEditChurch(actor, photo.churchId);
  await prisma.churchPhoto.delete({ where: { id: photoId } });
  await audit(actor, { action: "church.gallery_removed", entityType: "ChurchPhoto", entityId: photoId, churchId: photo.churchId, summary: "Removed a gallery photo", details: { url: photo.url } });
}

// ---------------------------------------------------------------------------
// Embedded images
// ---------------------------------------------------------------------------

const DATA_URI = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/;

/**
 * Moves images that were saved as embedded `data:` URIs into regular image
 * storage and replaces them with links. The picture is unchanged; it is
 * resized to at most 1600px and stored as WebP, which keeps the directory API
 * and pages from carrying megabytes of inline image data on every request.
 */
export async function moveEmbeddedImagesToStorage(actor: Actor) {
  if (!isStaff(actor) || actor.staffRole !== "ADMIN") throw new ForbiddenError("Only administrators can run this.");
  const prisma = await db();
  const sharp = (await import("sharp")).default;
  const { store } = await import("@/lib/media");

  async function convert(value: string, key: string) {
    const match = value.match(DATA_URI);
    if (!match) return null;
    const original = Buffer.from(match[2], "base64");
    if (!sniffImageType(original)) return null;
    const webp = await sharp(original).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    return store(`${key}.webp`, webp, "image/webp");
  }

  let moved = 0;
  let skipped = 0;
  const churches = await prisma.church.findMany({
    where: { OR: [{ logoUrl: { startsWith: "data:" } }, { featuredImageUrl: { startsWith: "data:" } }] },
    select: { id: true, slug: true, logoUrl: true, featuredImageUrl: true }
  });
  for (const c of churches) {
    for (const field of ["logoUrl", "featuredImageUrl"] as const) {
      const value = c[field];
      if (!value?.startsWith("data:")) continue;
      const url = await convert(value, `churches/${c.slug}-${field === "logoUrl" ? "logo" : "photo"}`);
      if (!url) {
        skipped += 1;
        continue;
      }
      await prisma.church.update({ where: { id: c.id }, data: { [field]: url } });
      await audit(actor, { action: "church.image_moved", entityType: "Church", entityId: c.id, churchId: c.id, summary: `Moved embedded ${field === "logoUrl" ? "logo" : "photo"} to image storage`, details: { url } });
      moved += 1;
    }
  }
  const pastors = await prisma.pastor.findMany({ where: { photoUrl: { startsWith: "data:" } }, select: { id: true, fullName: true, photoUrl: true, seniorForChurch: { select: { id: true, slug: true } } } });
  for (const p of pastors) {
    const church = p.seniorForChurch;
    const url = await convert(p.photoUrl!, `pastors/${church?.slug ?? p.id}-pastor`);
    if (!url) {
      skipped += 1;
      continue;
    }
    await prisma.pastor.update({ where: { id: p.id }, data: { photoUrl: url } });
    await audit(actor, { action: "pastor.image_moved", entityType: "Pastor", entityId: p.id, churchId: church?.id ?? null, summary: `Moved embedded photo of ${p.fullName} to image storage`, details: { url } });
    moved += 1;
  }
  return { moved, skipped };
}
