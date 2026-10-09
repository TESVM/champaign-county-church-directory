import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth";
import { canManageChurch } from "@/lib/actor";
import { getChurchIdBySlug } from "@/lib/services/churches";

/** Older upgrade links: managers go to billing, everyone else to the plan explanation. */
export default async function UpgradeRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [actor, church] = await Promise.all([getActor(), getChurchIdBySlug(slug)]);
  if (church && canManageChurch(actor, church.id)) redirect(`/dashboard/churches/${slug}/billing`);
  redirect(`/for-churches?church=${encodeURIComponent(slug)}`);
}
