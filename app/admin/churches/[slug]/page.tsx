import Link from "next/link";
import { notFound } from "next/navigation";
import { markSourceCheckedAction, setChurchStatusAction, setComplimentaryAction } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { SelectField, TextField } from "@/components/ui/field";
import { isAdmin } from "@/lib/actor";
import { requireStaff } from "@/lib/auth-guards";
import { listAuditLog } from "@/lib/services/audit";
import { getBillingSummary } from "@/lib/services/billing";
import { getChurchBySlug, verificationStatus } from "@/lib/services/churches";
import { listTeam } from "@/lib/services/claims";
import { formatDate } from "@/lib/utils";

export default async function AdminChurchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const actor = await requireStaff(`/admin/churches/${slug}`);
  const result = await getChurchBySlug(slug, { includeHidden: true });
  if (!result) notFound();
  const { church, row } = result;
  const [billing, team, history] = await Promise.all([getBillingSummary(church.id), listTeam(actor, church.id), listAuditLog({ churchId: church.id, take: 40 })]);
  const verification = verificationStatus(church);
  const reviewer = actor.staffRole === "ADMIN" || actor.staffRole === "REVIEWER";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm"><Link href="/admin/churches" className="underline">Churches</Link> / {church.name}</p>
        <h1 className="font-display text-4xl">{church.name}</h1>
        <p className="text-sm text-stone-600">{church.city} · status {row.status.toLowerCase()} · {verification.label}{"date" in verification ? ` (${formatDate(verification.date)})` : ""}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link className="inline-flex min-h-[44px] items-center rounded-full bg-brand-900 px-4 font-semibold text-white" href={`/dashboard/churches/${slug}/edit`}>Edit listing</Link>
          <Link className="inline-flex min-h-[44px] items-center rounded-full border border-line px-4 font-semibold" href={`/dashboard/churches/${slug}/photo`}>Photo</Link>
          <Link className="inline-flex min-h-[44px] items-center rounded-full border border-line px-4 font-semibold" href={`/dashboard/churches/${slug}/visit`}>Visit info</Link>
          <Link className="inline-flex min-h-[44px] items-center rounded-full border border-line px-4 font-semibold" href={`/dashboard/churches/${slug}/team`}>Team</Link>
          <Link className="inline-flex min-h-[44px] items-center rounded-full border border-line px-4 font-semibold" href={`/churches/${slug}`}>Public page</Link>
        </div>
      </div>

      {reviewer ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-display text-2xl">Public-source check</h2>
            <p className="mt-1 text-sm text-stone-600">Record that you checked this listing against the church’s website or another public source today.</p>
            <div className="mt-3">
              <ActionForm action={markSourceCheckedAction}>
                <input type="hidden" name="churchId" value={church.id} />
                <TextField name="sourceUrl" label="Source you checked" type="url" defaultValue={church.publicSourceUrl ?? church.websiteUrl} required />
                <SubmitButton>Record check</SubmitButton>
              </ActionForm>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-display text-2xl">Listing status</h2>
            <p className="mt-1 text-sm text-stone-600">Closed listings stay reachable with a notice. Merged listings redirect to the one kept. Hidden listings are removed from public pages.</p>
            <div className="mt-3">
              <ActionForm action={setChurchStatusAction}>
                <input type="hidden" name="churchId" value={church.id} />
                <SelectField name="status" label="Status" defaultValue={church.status} options={[{ value: "ACTIVE", label: "Active" }, { value: "CLOSED", label: "Closed" }, { value: "MERGED", label: "Duplicate (merge into another)" }, { value: "HIDDEN", label: "Hidden" }]} />
                <TextField name="mergeIntoSlug" label="Keep this listing instead (slug, for duplicates)" defaultValue="" />
                <TextField name="note" label="Note (shown on closed listings)" defaultValue={church.statusNote} />
                <SubmitButton>Update status</SubmitButton>
              </ActionForm>
            </div>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-2xl">Enhanced profile</h2>
          <p className="mt-2 text-sm">
            {billing.active ? `Active (${billing.source})` : "Not active"}
            {billing.subscription ? ` · Stripe status: ${billing.subscription.status}${billing.subscription.currentPeriodEnd ? `, period ends ${formatDate(billing.subscription.currentPeriodEnd.toISOString())}` : ""}` : " · no Stripe subscription"}
          </p>
          {billing.complimentaryUntil ? <p className="text-sm text-stone-600">Complimentary until {formatDate(billing.complimentaryUntil.toISOString())}: {billing.complimentaryReason}</p> : null}
          {isAdmin(actor) ? (
            <div className="mt-3">
              <ActionForm action={setComplimentaryAction}>
                <input type="hidden" name="churchId" value={church.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField name="until" label="Complimentary until" type="date" />
                  <TextField name="reason" label="Reason (recorded)" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <SubmitButton>Grant complimentary</SubmitButton>
                  {billing.complimentaryUntil ? <SubmitButton name="remove" value="true" variant="secondary">Remove complimentary</SubmitButton> : null}
                </div>
              </ActionForm>
            </div>
          ) : null}
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-2xl">Team</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {team.length ? team.map((m) => <li key={m.id}>{m.user.email} — {m.role === "CHURCH_OWNER" ? "owner" : "editor"} ({m.status.toLowerCase()})</li>) : <li className="text-stone-600">No one manages this listing.</li>}
          </ul>
          <h3 className="mt-4 font-semibold">Photo provenance</h3>
          <p className="text-sm text-stone-700">{row.featuredImageUrl ? `${row.featuredImageCredit ?? "Credit not recorded"} — ${row.featuredImagePermission ?? "permission not recorded"}${row.featuredImageIsAi ? " (AI-generated; hidden from public)" : ""}` : "No photo."}</p>
          {row.featuredImageSourceUrl ? <a className="text-sm underline" href={row.featuredImageSourceUrl} target="_blank" rel="noopener noreferrer nofollow">Photo source</a> : null}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-display text-2xl">History</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {history.map((h) => (
            <li key={h.id} className="border-b border-line pb-2">
              <span className="text-stone-600">{h.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</span> · {h.actorEmail ?? "unknown"} · {h.summary}
            </li>
          ))}
          {history.length === 0 ? <li className="text-stone-600">No recorded changes.</li> : null}
        </ul>
      </Card>
    </div>
  );
}
