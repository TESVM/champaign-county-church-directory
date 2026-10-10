import Link from "next/link";
import { reviewCampusEventAction, reviewOrganizationAction } from "@/app/actions";
import { FlashBanner } from "@/components/admin/flash-banner";
import { StatusFilter } from "@/components/admin/status-filter";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { requireReviewer } from "@/lib/auth-guards";
import { campusLabel, eventCategoryLabel, MEETING_TYPES } from "@/lib/campus";
import { listCampusEventsForReview, listOrganizationsForReview } from "@/lib/services/campus";
import { displayTime } from "@/lib/time/chicago";

export default async function AdminCampusPage({ searchParams }: { searchParams: Promise<{ status?: string; done?: string }> }) {
  const actor = await requireReviewer("/admin/campus");
  const params = await searchParams;
  const status = ["PENDING", "APPROVED", "REJECTED", "ALL"].includes(params.status ?? "") ? params.status! : "PENDING";
  const [orgs, events] = await Promise.all([listOrganizationsForReview(actor, status), listCampusEventsForReview(actor, status)]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Campus Faith</h1>
      <FlashBanner code={params.done} />
      <p className="text-sm text-stone-700">
        Check that the group is a real Christian student organization or ministry, the submitter plausibly leads it (role, email domain, matching public pages), and nothing private about a student is published without their
        permission. “Request changes” keeps the listing hidden and emails your note.
      </p>
      <StatusFilter base="/admin/campus" current={status} options={[["PENDING", "Pending"], ["APPROVED", "Published"], ["REJECTED", "Declined"], ["ALL", "All"]]} />

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Organizations ({orgs.length})</h2>
        {orgs.length === 0 ? <p className="text-sm text-stone-600">Nothing here.</p> : null}
        {orgs.map((o) => (
          <Card key={o.id} className="space-y-2 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
              {o.campuses.map(campusLabel).join(" · ")} · {o.status}
              {o.verifiedAt ? " · Verified" : ""}
              {o.reviewerNote && o.status === "PENDING" ? " · Changes requested" : ""}
            </p>
            <h3 className="font-display text-xl">
              <Link className="hover:underline" href={`/campus/organizations/${o.slug}`}>
                {o.name}
              </Link>
            </h3>
            <p className="text-sm">{o.description}</p>
            <dl className="grid gap-x-6 gap-y-1 text-sm text-stone-700 sm:grid-cols-2">
              {[
                ["Affiliation", o.affiliation],
                ["Meets", [o.meetingDay, o.meetingTime, o.meetingLocation].filter(Boolean).join(" · ")],
                ["Gatherings", o.meetingTypes.map((t) => MEETING_TYPES.find(([k]) => k === t)?.[1] ?? t).join(", ")],
                ["Who is welcome", o.whoIsWelcome],
                ["Links", [o.websiteUrl, o.instagramUrl, o.facebookUrl, o.otherSocialUrl, o.registrationUrl].filter(Boolean).join(" · ")],
                ["Logo", o.logoUrl],
                ["Submitted by (private)", o.submitterName ? `${o.submitterName}, ${o.submitterRole} <${o.submitterEmail}>` : null],
                ["Publish contact", o.publishContact ? "Yes" : "No"],
                ["Previous note", o.reviewerNote]
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="inline font-medium">{k}: </dt>
                    <dd className="inline break-words">{v}</dd>
                  </div>
                ))}
            </dl>
            <ActionForm action={reviewOrganizationAction}>
              <input type="hidden" name="id" value={o.id} />
              <TextField name="note" label="Note to the organization (required to decline or request changes)" />
              <label className="flex min-h-[44px] items-center gap-3 text-sm">
                <input type="checkbox" name="verify" value="true" defaultChecked={Boolean(o.verifiedAt)} className="h-5 w-5 rounded border-line" />
                Mark verified (I confirmed this with the organization or an official campus source)
              </label>
              <div className="flex flex-wrap gap-2">
                <SubmitButton name="decision" value="APPROVED">
                  Approve and publish
                </SubmitButton>
                <SubmitButton name="decision" value="CHANGES" variant="secondary">
                  Request changes
                </SubmitButton>
                <SubmitButton name="decision" value="REJECTED" variant="danger">
                  Decline
                </SubmitButton>
              </div>
            </ActionForm>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Student events ({events.length})</h2>
        {events.length === 0 ? <p className="text-sm text-stone-600">Nothing here.</p> : null}
        {events.map((e) => (
          <Card key={e.id} className="space-y-2 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
              {e.startDate}
              {e.startTime ? ` · ${displayTime(e.startTime)}` : ""} · {e.status}
            </p>
            <h3 className="font-display text-xl">{e.title}</h3>
            <p className="text-sm text-stone-700">
              {[e.organization?.name, e.location, e.campuses.map(campusLabel).join(", "), e.categories.map(eventCategoryLabel).join(", "), e.registrationUrl].filter(Boolean).join(" · ")}
            </p>
            {e.description ? <p className="whitespace-pre-line text-sm">{e.description}</p> : null}
            <p className="text-xs text-stone-600">
              Submitted by {e.submitterName} &lt;{e.submitterEmail}&gt; (private)
            </p>
            <ActionForm action={reviewCampusEventAction}>
              <input type="hidden" name="id" value={e.id} />
              <TextField name="note" label="Note (required to decline)" />
              <div className="flex flex-wrap gap-2">
                <SubmitButton name="decision" value="APPROVED">
                  Publish
                </SubmitButton>
                <SubmitButton name="decision" value="REJECTED" variant="danger">
                  Decline
                </SubmitButton>
              </div>
            </ActionForm>
          </Card>
        ))}
      </section>
    </div>
  );
}
