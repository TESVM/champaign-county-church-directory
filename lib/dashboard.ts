import { notFound } from "next/navigation";
import { canManageChurch } from "@/lib/actor";
import { requireChurchEditor } from "@/lib/auth-guards";
import { getChurchBySlug } from "@/lib/services/churches";

/** Loads a church for its dashboard, enforcing that the signed-in user may edit it. */
export async function loadManagedChurch(slug: string, path = "") {
  const result = await getChurchBySlug(slug, { includeHidden: true });
  if (!result) notFound();
  const actor = await requireChurchEditor(result.church.id, `/dashboard/churches/${slug}${path}`);
  return { ...result, actor, canManage: canManageChurch(actor, result.church.id) };
}
