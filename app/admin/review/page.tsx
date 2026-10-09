import { FlashBanner } from "@/components/admin/flash-banner";
import Link from "next/link";
import { decideChangeAction, runWebsiteReviewAction } from "@/app/actions";
import { StatusFilter } from "@/components/admin/status-filter";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { requireReviewer } from "@/lib/auth-guards";
import { listRecentChecks, listSuggestedChanges } from "@/lib/scan/website-review";
import { formatDate } from "@/lib/utils";

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ status?: string; done?: string }> }) {
  const actor = await requireReviewer("/admin/review");
  const params = await searchParams;
  const status = params.status ?? "PENDING";
  const [changes, checks] = await Promise.all([listSuggestedChanges(actor, status), listRecentChecks(30)]);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Website review</h1>
      <FlashBanner code={params.done} />
      <Card className="p-5 text-sm leading-6 text-stone-700">
        <p>
          Each week the directory fetches up to 25 churches’ own websites (never Facebook or other sign-in platforms), obeys robots.txt, and records exactly what happened.
          When a page shows a different phone number, an email we do not have, or a redirect to a new domain, it proposes a change here. Nothing changes on a listing until you approve it.
        </p>
        <div className="mt-3">
          <ActionForm action={runWebsiteReviewAction}>
            <SubmitButton variant="secondary" pendingLabel="Checking websites…">Check the next 5 websites now</SubmitButton>
          </ActionForm>
        </div>
      </Card>

      <section aria-labelledby="proposals">
        <h2 id="proposals" className="font-display text-2xl">Proposed changes</h2>
        <div className="mt-3"><StatusFilter base="/admin/review" current={status} options={[["PENDING", "Pending"], ["APPROVED", "Applied"], ["REJECTED", "Rejected"], ["ALL", "All"]]} /></div>
        <div className="mt-3 space-y-3">
          {changes.length === 0 ? <p className="text-sm text-stone-600">Nothing here.</p> : null}
          {changes.map((c) => (
            <Card key={c.id} className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">{c.source} · {c.status} · {formatDate(c.createdAt.toISOString())}</p>
              <h3 className="font-display text-xl"><Link className="hover:underline" href={`/admin/churches/${c.church.slug}`}>{c.church.name}</Link> — {c.fieldName}</h3>
              <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="font-semibold">Current</dt><dd className="break-all">{c.oldValue || "—"}</dd></div>
                <div><dt className="font-semibold">Proposed</dt><dd className="break-all">{c.newValue || "(remove / needs review)"}</dd></div>
              </dl>
              {c.evidence ? <p className="mt-2 rounded-xl bg-brand-50 p-3 text-sm">{c.evidence}</p> : null}
              {c.sourceUrl ? <p className="mt-1 text-xs"><a className="underline" href={c.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">Source page</a></p> : null}
              {c.church.leadershipConfirmedAt || c.church.claimed ? (
                <p className="mt-2 text-sm font-semibold text-amber-900">This listing is managed or confirmed by church leadership. Check with them before applying.</p>
              ) : null}
              {c.status === "PENDING" ? (
                <div className="mt-3">
                  <ActionForm action={decideChangeAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <TextField name="note" label="Note (optional)" />
                    <div className="flex flex-wrap gap-2">
                      <SubmitButton name="decision" value="APPROVED">Apply change</SubmitButton>
                      <SubmitButton name="decision" value="REJECTED" variant="secondary">Reject</SubmitButton>
                    </div>
                  </ActionForm>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="checks">
        <h2 id="checks" className="font-display text-2xl">Recent website checks</h2>
        <div className="mt-3 overflow-x-auto rounded-[20px] border border-line bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-brand-50"><tr><th className="p-3">When</th><th className="p-3">Church</th><th className="p-3">Result</th><th className="p-3">Detail</th></tr></thead>
            <tbody>
              {checks.map((k) => (
                <tr key={k.id} className="border-t border-line">
                  <td className="p-3 whitespace-nowrap">{k.startedAt.toISOString().slice(0, 16).replace("T", " ")} UTC</td>
                  <td className="p-3">{k.church.name}</td>
                  <td className="p-3">{k.outcome.replace(/_/g, " ").toLowerCase()}{k.httpStatus ? ` (${k.httpStatus})` : ""}</td>
                  <td className="p-3 text-stone-600">{k.error ?? (k.proposals ? `${k.proposals} proposal(s)` : "no changes found")}</td>
                </tr>
              ))}
              {checks.length === 0 ? <tr><td className="p-3 text-stone-600" colSpan={4}>No checks have run yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
