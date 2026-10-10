import { z } from "zod";
import { type Actor, assertCanEditChurch } from "@/lib/actor";
import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
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

export async function saveChurchPhoto(
  actor: Actor,
  churchId: string,
  input: { file?: File | null; imageUrl?: unknown; sourceUrl?: unknown; credit?: unknown; permission?: unknown }
) {
  assertCanEditChurch(actor, churchId);
  const prisma = await db();
  const church = await prisma.church.findUniqueOrThrow({ where: { id: churchId } });

  const hasFile = input.file instanceof File && input.file.size > 0;
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
