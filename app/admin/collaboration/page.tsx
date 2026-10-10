import Link from "next/link";
import { reviewCollabPostAction } from "@/app/actions";
import { FlashBanner } from "@/components/admin/flash-banner";
import { StatusFilter } from "@/components/admin/status-filter";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { requireReviewer } from "@/lib/auth-guards";
import { collabCategoryLabel, REPORT_REASONS } from "@/lib/collab";
import { listCollabForReview } from "@/lib/services/collab";
import { formatChicago } from "@/lib/time/chicago";

const VIEWS = ["PENDING", "REPORTED", "APPROVED", "REJECTED", "ALL"] as const;
type View = (typeof VIEWS)[number];

export default async function AdminCollaborationPage({ searchParams }: { searchParams: Promise<{ status?: string; done?: string }> }) {
  const actor = await requireReviewer("/admin/collaboration");
  const params = await searchParams;
  const view: View = VIEWS.includes(params.status as View) ? (params.status as View) : "PENDING";
  const posts = await listCollabForReview(actor, view);
  const now = new Date();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl">Collaboration Board</h1>
        <Link href="/collaborate/new" className="inline-flex min-h-[44px] items-center rounded-full border border-line px-4 text-sm font-semibold">
          Post for a ministry
        </Link>
      </div>
      <FlashBanner code={params.done} />
      <p className="text-sm text-stone-700">
        Publish practical church and ministry opportunities only. Decline advertising, fundraising for individuals, prayer requests, and anything naming a private person without permission. Posts with 3 reports are hidden until you
        review them.
      </p>
      <StatusFilter base="/admin/collaboration" current={view} options={[["PENDING", "Pending"], ["REPORTED", "Reported"], ["APPROVED", "Published"], ["REJECTED", "Declined"], ["ALL", "All"]]} />
      {posts.length === 0 ? <p className="text-sm text-stone-600">Nothing here.</p> : null}
      {posts.map((p) => {
        const expired = p.expiresAt <= now;
        return (
          <Card key={p.id} className="space-y-2 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
              {collabCategoryLabel(p.category)} · {p.status}
              {p.closedAt ? " · taken down" : expired ? " · expired" : ""}
              {p.reports.length ? ` · ${p.reports.length} open report${p.reports.length === 1 ? "" : "s"}` : ""}
            </p>
            <h2 className="font-display text-xl">{p.title}</h2>
            <p className="text-sm text-stone-600">
              {p.church ? (
                <Link href={`/admin/churches/${p.church.slug}`} className="underline">
                  {p.church.name}
                </Link>
              ) : (
                p.organizationName
              )}{" "}
              · by {p.createdBy} · until {formatChicago(new Date(p.expiresAt.getTime() - 1), { month: "short", day: "numeric", year: "numeric" })}
            </p>
            <p className="whitespace-pre-line text-sm">{p.body}</p>
            <p className="text-sm text-stone-700">{[p.location, p.contactName, p.contactEmail, p.contactPhone, p.contactUrl].filter(Boolean).join(" · ")}</p>
            {p.reports.length ? (
              <ul className="list-disc pl-5 text-sm text-red-900">
                {p.reports.map((r, i) => (
                  <li key={i}>
                    {REPORT_REASONS.find(([k]) => k === r.reason)?.[1] ?? r.reason} ({formatChicago(r.createdAt, { month: "short", day: "numeric" })})
                  </li>
                ))}
              </ul>
            ) : null}
            {p.reviewerNote ? <p className="text-xs text-stone-500">Note: {p.reviewerNote}</p> : null}
            <ActionForm action={reviewCollabPostAction}>
              <input type="hidden" name="id" value={p.id} />
              <TextField name="note" label="Note to the poster (required to decline or remove)" />
              <div className="flex flex-wrap gap-2">
                {p.status !== "APPROVED" ? <SubmitButton name="decision" value="APPROVED">Publish</SubmitButton> : null}
                {p.reports.length ? (
                  <SubmitButton name="decision" value="DISMISS_REPORTS" variant="secondary">
                    Keep and dismiss reports
                  </SubmitButton>
                ) : null}
                <SubmitButton name="decision" value={p.status === "APPROVED" ? "REMOVED" : "REJECTED"} variant="danger">
                  {p.status === "APPROVED" ? "Remove" : "Decline"}
                </SubmitButton>
              </div>
            </ActionForm>
          </Card>
        );
      })}
    </div>
  );
}
