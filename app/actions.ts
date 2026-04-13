"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { contactSchema, claimSchema, submitListingSchema } from "@/lib/validation/forms";
import {
  createPersistedClaimRequest,
  reviewPersistedClaimRequest,
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
