import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { reviewClaimRequestAction } from "@/app/actions";
import { Card } from "@/components/ui/card";
import { requireAdminAccess } from "@/lib/auth-guards";
import { getPersistedClaimRequests } from "@/lib/data/admin-store";
import { formatDate } from "@/lib/utils";

export default async function AdminClaimsPage() {
  await requireAdminAccess();

  const claims = await getPersistedClaimRequests();

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <AdminSidebar />
        <div className="space-y-6 admin-shell rounded-[36px] border border-white/70 p-5 sm:p-8">
          <div className="section-strong rounded-[30px] border border-white/70 px-6 py-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">Claim Requests</p>
            <h1 className="mt-4 font-display text-5xl">Verify pastors and delegated church admins</h1>
            <p className="mt-4 text-lg text-stone-600">
              Approve only after a proof step that reasonably demonstrates authorization through domain email, public phone, or manual evidence.
            </p>
          </div>
          {claims.map((claim) => (
            <Card key={claim.id} className="border-white/70 bg-gradient-to-br from-white via-brand-50 to-sky/30 p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">{claim.status.replaceAll("_", " ")}</p>
                  <h2 className="mt-3 font-display text-3xl">{claim.churchName}</h2>
                  <p className="mt-2 text-sm text-stone-600">
                    {claim.applicantName} • {claim.applicantRole} • {claim.applicantEmail}
                  </p>
                  <p className="mt-4 text-sm leading-7 text-stone-700">{claim.evidenceSummary}</p>
                  {claim.reviewerNote ? (
                    <div className="mt-4 rounded-2xl bg-white/80 p-4 ring-1 ring-brand-100">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Reviewer note</p>
                      <p className="mt-2 text-sm text-stone-600">{claim.reviewerNote}</p>
                    </div>
                  ) : null}
                </div>
                <div className="min-w-[220px] rounded-[24px] bg-white/80 p-4 ring-1 ring-brand-100">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Verification method</p>
                  <p className="mt-2 font-semibold text-ink">{claim.verificationMethod.replaceAll("_", " ")}</p>
                  <p className="mt-4 text-sm text-stone-600">Submitted {formatDate(claim.submittedAt)}</p>
                  <div className="mt-5 space-y-3">
                    <form action={reviewClaimRequestAction}>
                      <input type="hidden" name="claimId" value={claim.id} />
                      <input type="hidden" name="decision" value="APPROVED" />
                      <button className="w-full rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white">Approve</button>
                    </form>
                    <form action={reviewClaimRequestAction} className="space-y-2">
                      <input type="hidden" name="claimId" value={claim.id} />
                      <input type="hidden" name="decision" value="MORE_INFO" />
                      <textarea
                        name="reviewerNote"
                        placeholder="Ask for one more proof point"
                        className="min-h-24 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-stone-400"
                      />
                      <button className="w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-line">Request more info</button>
                    </form>
                    <form action={reviewClaimRequestAction}>
                      <input type="hidden" name="claimId" value={claim.id} />
                      <input type="hidden" name="decision" value="DENIED" />
                      <button className="w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-line">Deny</button>
                    </form>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
