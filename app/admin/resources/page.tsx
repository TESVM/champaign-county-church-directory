import { FlashBanner } from "@/components/admin/flash-banner";
import Link from "next/link";
import { moderateResourceAction } from "@/app/actions";
import { StatusFilter } from "@/components/admin/status-filter";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { requireReviewer } from "@/lib/auth-guards";
import { RESOURCE_CATEGORIES, listResources } from "@/lib/services/engagement";

export default async function AdminResourcesPage({ searchParams }: { searchParams: Promise<{ status?: string; done?: string }> }) {
  await requireReviewer("/admin/resources");
  const params = await searchParams;
  const raw = params.status ?? "PENDING";
  const status = (["PENDING", "APPROVED", "REJECTED", "ALL"].includes(raw) ? raw : "PENDING") as "PENDING" | "APPROVED" | "REJECTED" | "ALL";
  const resources = await listResources({ status });
  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl">Community programs</h1>
      <FlashBanner code={params.done} />
      <p className="text-sm text-stone-700">Check that the program is real, public, and described accurately (schedule, eligibility). Reject anything that is an advertisement or collects personal data.</p>
      <StatusFilter base="/admin/resources" current={status} options={[["PENDING", "Pending"], ["APPROVED", "Published"], ["REJECTED", "Rejected"], ["ALL", "All"]]} />
      {resources.length === 0 ? <p className="text-sm text-stone-600">Nothing here.</p> : null}
      {resources.map((r) => (
        <Card key={r.id} className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">{RESOURCE_CATEGORIES.find((c) => c.value === r.category)?.label} · {r.status}</p>
          <h2 className="font-display text-xl">{r.title} — <Link className="hover:underline" href={`/admin/churches/${r.church.slug}`}>{r.church.name}</Link></h2>
          <p className="mt-2 text-sm">{r.description}</p>
          <p className="mt-1 text-sm text-stone-600">{[r.schedule && `When: ${r.schedule}`, r.eligibility && `Eligibility: ${r.eligibility}`, r.contact && `Contact: ${r.contact}`, r.url].filter(Boolean).join(" · ")}</p>
          {r.status !== "APPROVED" || status === "ALL" ? (
            <div className="mt-3">
              <ActionForm action={moderateResourceAction}>
                <input type="hidden" name="id" value={r.id} />
                <TextField name="note" label="Note to the church (required to reject)" />
                <div className="flex flex-wrap gap-2">
                  <SubmitButton name="decision" value="APPROVED">Publish</SubmitButton>
                  <SubmitButton name="decision" value="REJECTED" variant="danger">Reject</SubmitButton>
                </div>
              </ActionForm>
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
