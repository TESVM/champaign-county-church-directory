import Link from "next/link";
import { reviewClaimAction } from "@/app/actions";
import { StatusFilter } from "@/components/admin/status-filter";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { TextAreaField } from "@/components/ui/field";
import { requireReviewer } from "@/lib/auth-guards";
import { listClaims } from "@/lib/services/claims";
import { formatDate } from "@/lib/utils";

const METHOD = { DOMAIN_EMAIL: "Church email domain", PUBLIC_PHONE: "Call church’s public phone", MANUAL_REVIEW: "Other evidence" } as const;

export default async function ClaimsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const actor = await requireReviewer("/admin/claims");
  const status = (await searchParams).status ?? "PENDING";
  const claims = await listClaims(actor, status === "ALL" ? undefined : status);
  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl">Claim requests</h1>
      <p className="text-sm text-stone-700">Approve only after verifying authority: the email domain matches the church’s website, or you reached the church at its <em>publicly listed</em> number and they confirmed the person.</p>
      <StatusFilter base="/admin/claims" current={status} options={[["PENDING", "Pending"], ["MORE_INFO", "Waiting on applicant"], ["APPROVED", "Approved"], ["DENIED", "Declined"], ["ALL", "All"]]} />
      {claims.length === 0 ? <p className="text-sm text-stone-600">Nothing here.</p> : null}
      {claims.map((claim) => (
        <Card key={claim.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">{claim.status.replace("_", " ")} · {formatDate(claim.submittedAt.toISOString())}</p>
              <h2 className="font-display text-2xl">
                <Link href={`/admin/churches/${claim.church.slug}`} className="hover:underline">{claim.church.name}</Link>
              </h2>
              <p className="text-sm text-stone-700">{claim.applicantName} · {claim.applicantRole} · {claim.applicantEmail}{claim.applicantPhone ? ` · ${claim.applicantPhone}` : ""}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${claim.emailDomainMatches ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>
              {claim.emailDomainMatches ? "Email domain matches church website" : "Email domain does not match website"}
            </span>
          </div>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="font-semibold">Requested verification</dt><dd>{METHOD[claim.verificationMethod]}</dd></div>
            <div><dt className="font-semibold">Church’s public contact</dt><dd>{[claim.church.phone, claim.church.email, claim.church.websiteUrl].filter(Boolean).join(" · ") || "None on file"}</dd></div>
          </dl>
          <p className="mt-3 whitespace-pre-line rounded-xl bg-brand-50 p-3 text-sm">{claim.evidenceSummary}</p>
          {claim.reviewerNote ? <p className="mt-2 text-sm text-stone-600">Reviewer note: {claim.reviewerNote}{claim.reviewedBy ? ` (${claim.reviewedBy})` : ""}</p> : null}
          {claim.status === "PENDING" || claim.status === "MORE_INFO" ? (
            <div className="mt-4">
              <ActionForm action={reviewClaimAction}>
                <input type="hidden" name="claimId" value={claim.id} />
                <TextAreaField name="reviewerNote" label="Note to the applicant (required to decline or ask for more)" rows={2} />
                <div className="flex flex-wrap gap-2">
                  <SubmitButton name="decision" value="APPROVED" pendingLabel="Working…">Approve as owner</SubmitButton>
                  <SubmitButton name="decision" value="MORE_INFO" variant="secondary" pendingLabel="Working…">Ask for more information</SubmitButton>
                  <SubmitButton name="decision" value="DENIED" variant="danger" pendingLabel="Working…">Decline</SubmitButton>
                </div>
              </ActionForm>
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
