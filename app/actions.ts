"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { externalUrl } from "@/lib/utils";
import { contactSchema, claimSchema, submitListingSchema } from "@/lib/validation/forms";
import {
  createPersistedClaimRequest,
  reviewPersistedClaimRequest,
  saveChurchMediaRecord,
  saveChurchListingRecord,
  saveChurchStatusRecord,
  saveSiteContentRecord
} from "@/lib/data/admin-store";

export async function submitContactAction(formData: FormData) {
  contactSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message")
  });
}

export async function submitListingAction(formData: FormData) {
  submitListingSchema.parse({
    churchName: formData.get("churchName"),
    city: formData.get("city"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    websiteUrl: formData.get("websiteUrl"),
    appUrl: formData.get("appUrl"),
    seniorPastor: formData.get("seniorPastor"),
    serviceTimes: formData.get("serviceTimes"),
    description: formData.get("description")
  });
}

export async function claimListingAction(formData: FormData) {
  const payload = claimSchema.parse({
    churchName: formData.get("churchName"),
    churchSlug: formData.get("churchSlug"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    role: formData.get("role"),
    verificationMethod: formData.get("verificationMethod"),
    phone: formData.get("phone"),
    evidence: formData.get("evidence"),
    message: formData.get("message")
  });

  await createPersistedClaimRequest({
    churchSlug: payload.churchSlug || undefined,
    churchName: payload.churchName,
    contactName: payload.contactName,
    contactEmail: payload.contactEmail,
    role: payload.role,
    verificationMethod: payload.verificationMethod,
    evidence: `${payload.evidence}\n\nContext: ${payload.message}`
  });

  redirect(`/claim?submitted=1${payload.churchSlug ? `&church=${payload.churchSlug}` : ""}`);
}

export async function reviewClaimRequestAction(formData: FormData) {
  const claimId = formData.get("claimId")?.toString();
  const decision = formData.get("decision")?.toString() as "APPROVED" | "MORE_INFO" | "DENIED" | undefined;
  const reviewerNote = formData.get("reviewerNote")?.toString();

  if (!claimId || !decision) {
    return;
  }

  await reviewPersistedClaimRequest({
    claimId,
    decision,
    reviewerNote
  });

  revalidatePath("/admin");
  revalidatePath("/admin/claims");
  revalidatePath("/dashboard");
}

export async function saveSiteContentAction(formData: FormData) {
  const key = formData.get("key")?.toString();
  const label = formData.get("label")?.toString();
  const value = formData.get("value")?.toString();
  const area = formData.get("area")?.toString() as "homepage" | "about" | "directory" | "global" | undefined;

  if (!key || !label || !value || !area) {
    return;
  }

  await saveSiteContentRecord({
    key,
    label,
    value,
    area
  });

  revalidatePath("/admin/content");
  revalidatePath("/");
  revalidatePath("/directory");
}

async function fileToDataUrl(file: File | null) {
  if (!file || file.size === 0) {
    return undefined;
  }

  if (!file.type.startsWith("image/")) {
    return undefined;
  }

  if (file.size > 4 * 1024 * 1024) {
    return undefined;
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:${file.type};base64,${base64}`;
}

function normalizedReturnPath(value: FormDataEntryValue | null, fallback: string) {
  const path = value?.toString();
  return path?.startsWith("/") ? path : fallback;
}

async function requireChurchManageAccess(churchSlug: string) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const canManageChurch =
    session.user.role === "ADMIN" ||
    session.user.role === "REVIEWER" ||
    session.user.role === "SUPPORT" ||
    (session.user.churchSlugs ?? []).includes(churchSlug);

  if (!canManageChurch) {
    redirect("/dashboard");
  }

  return session;
}

export async function saveChurchMediaAction(formData: FormData) {
  const churchSlug = formData.get("churchSlug")?.toString();

  if (!churchSlug) {
    return;
  }

  await requireChurchManageAccess(churchSlug);
  const returnPath = normalizedReturnPath(formData.get("returnPath"), `/admin/churches/${churchSlug}`);

  const featuredImageFile = formData.get("featuredImageFile");
  const uploadedFeaturedImage =
    featuredImageFile instanceof File ? await fileToDataUrl(featuredImageFile) : undefined;

  await saveChurchMediaRecord({
    churchSlug,
    featuredImageUrl:
      uploadedFeaturedImage ??
      externalUrl(formData.get("featuredImageUrl")?.toString()) ??
      undefined,
    logoUrl: externalUrl(formData.get("logoUrl")?.toString()) ?? undefined
  });

  revalidatePath(`/admin/churches/${churchSlug}`);
  revalidatePath(`/dashboard/churches/${churchSlug}`);
  revalidatePath(`/churches/${churchSlug}`);

  redirect(`${returnPath}?saved=media`);
}

export async function saveChurchListingAction(formData: FormData) {
  const churchSlug = formData.get("churchSlug")?.toString();

  if (!churchSlug) {
    return;
  }

  await requireChurchManageAccess(churchSlug);
  const returnPath = normalizedReturnPath(formData.get("returnPath"), `/admin/churches/${churchSlug}`);

  await saveChurchListingRecord({
    churchSlug,
    name: formData.get("name")?.toString(),
    city: formData.get("city")?.toString(),
    pastorFullName: formData.get("pastorFullName")?.toString(),
    denomination: formData.get("denomination")?.toString(),
    websiteUrl: externalUrl(formData.get("websiteUrl")?.toString()) ?? undefined,
    appUrl: externalUrl(formData.get("appUrl")?.toString()) ?? undefined,
    livestreamUrl: externalUrl(formData.get("livestreamUrl")?.toString()) ?? undefined,
    phone: formData.get("phone")?.toString(),
    email: formData.get("email")?.toString(),
    description: formData.get("description")?.toString()
  });

  revalidatePath(`/admin/churches/${churchSlug}`);
  revalidatePath(`/dashboard/churches/${churchSlug}`);
  revalidatePath(`/churches/${churchSlug}`);
  revalidatePath("/directory");

  redirect(`${returnPath}?saved=record`);
}

export async function saveChurchStatusAction(formData: FormData) {
  const churchSlug = formData.get("churchSlug")?.toString();
  const field = formData.get("field")?.toString();

  if (!churchSlug || (field !== "verified" && field !== "claimed")) {
    return;
  }

  await requireChurchManageAccess(churchSlug);
  const returnPath = normalizedReturnPath(formData.get("returnPath"), `/admin/churches/${churchSlug}`);

  await saveChurchStatusRecord({
    churchSlug,
    ...(field === "verified" ? { verified: true } : {}),
    ...(field === "claimed" ? { claimed: true } : {})
  });

  revalidatePath(`/admin/churches/${churchSlug}`);
  revalidatePath(`/dashboard/churches/${churchSlug}`);
  revalidatePath(`/churches/${churchSlug}`);
  revalidatePath("/directory");

  redirect(`${returnPath}?saved=${field}`);
}
