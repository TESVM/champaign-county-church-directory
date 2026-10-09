import { FlashBanner } from "@/components/admin/flash-banner";
import Link from "next/link";
import { reviewSubmissionAction } from "@/app/actions";
import { StatusFilter } from "@/components/admin/status-filter";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { CheckboxField, TextAreaField } from "@/components/ui/field";
import { requireReviewer } from "@/lib/auth-guards";
import { listSubmissions } from "@/lib/services/inbox";
import { formatDate } from "@/lib/utils";

export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<{ status?: string; done?: string }> }) {
  const actor = await requireReviewer("/admin/submissions");
  const params = await searchParams;
  const status = params.status ?? "PENDING";
  const rows = await listSubmissions(actor, status);
  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl">New church submissions</h1>
      <FlashBanner code={params.done} />
      <p className="text-sm text-stone-700">Check the church exists (website, sign, or call) before approving. Approved churches publish immediately as “not yet verified”.</p>
      <StatusFilter base="/admin/submissions" current={status} options={[["PENDING", "Pending"], ["APPROVED", "Approved"], ["REJECTED", "Declined"], ["ALL", "All"]]} />
      {rows.length === 0 ? <p className="text-sm text-stone-600">Nothing here.</p> : null}
      {rows.map((s) => (
        <Card key={s.id} className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">{s.status} · {formatDate(s.createdAt.toISOString())}</p>
          <h2 className="font-display text-2xl">{s.data.churchName}</h2>
          <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            <div><dt className="inline font-semibold">Address: </dt><dd className="inline">{s.data.address1}, {s.data.citySlug} {s.data.zip}</dd></div>
            <div><dt className="inline font-semibold">Phone / email: </dt><dd className="inline">{[s.data.phone, s.data.churchEmail].filter(Boolean).join(" · ") || "—"}</dd></div>
            <div><dt className="inline font-semibold">Website: </dt><dd className="inline">{s.data.websiteUrl ? <a href={s.data.websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">{s.data.websiteUrl}</a> : "—"}</dd></div>
            <div><dt className="inline font-semibold">Pastor / denomination: </dt><dd className="inline">{[s.data.seniorPastor, s.data.denomination].filter(Boolean).join(" · ") || "—"}</dd></div>
            <div className="sm:col-span-2"><dt className="inline font-semibold">Services: </dt><dd className="inline whitespace-pre-line">{s.data.serviceTimes}</dd></div>
            <div className="sm:col-span-2"><dt className="inline font-semibold">Submitted by: </dt><dd className="inline">{s.contactName} &lt;{s.contactEmail}&gt; {s.data.relationship ? `· ${s.data.relationship}` : ""}</dd></div>
          </dl>
          {s.data.description ? <p className="mt-2 rounded-xl bg-brand-50 p-3 text-sm">{s.data.description}</p> : null}
          {s.duplicates.length ? (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
              Possible duplicates: {s.duplicates.map((d, i) => (<span key={d.id}>{i ? ", " : ""}<Link className="underline" href={`/admin/churches/${d.slug}`}>{d.name}</Link> ({d.city}, {d.status.toLowerCase()})</span>))}
            </p>
          ) : null}
          {s.createdChurchId ? <p className="mt-2 text-sm">Published. </p> : null}
          {s.reviewerNote ? <p className="mt-2 text-sm text-stone-600">Note: {s.reviewerNote}</p> : null}
          {s.status === "PENDING" ? (
            <div className="mt-4">
              <ActionForm action={reviewSubmissionAction}>
                <input type="hidden" name="submissionId" value={s.id} />
                {s.duplicates.length ? <CheckboxField name="allowDuplicate" value="true" label="I checked: this is a different congregation" /> : null}
                <TextAreaField name="note" label="Note to the submitter (required to decline)" rows={2} />
                <div className="flex flex-wrap gap-2">
                  <SubmitButton name="decision" value="APPROVED">Approve and publish</SubmitButton>
                  <SubmitButton name="decision" value="REJECTED" variant="danger">Decline</SubmitButton>
                </div>
              </ActionForm>
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
