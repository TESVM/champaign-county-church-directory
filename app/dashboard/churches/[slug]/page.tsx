import Image from "next/image";
import Link from "next/link";
import { saveChurchListingAction, saveChurchMediaAction } from "@/app/actions";
import { notFound } from "next/navigation";
import { ChurchDashboardSidebar } from "@/components/dashboard/church-dashboard-sidebar";
import { ChurchMediaForm } from "@/components/forms/church-media-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireChurchAccess } from "@/lib/auth-guards";
import { getChurchBySlug } from "@/lib/data/queries";
import {
  getPersistedChurchMediaBySlug,
  getPersistedClaimRequestByChurchSlug,
  getPersistedMembershipsByChurchSlug,
  getPersistedMembershipsByEmail
} from "@/lib/data/admin-store";
import { formatDate } from "@/lib/utils";

export default async function ChurchWorkspacePage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const savedState = Array.isArray(resolvedSearchParams.saved) ? resolvedSearchParams.saved[0] : resolvedSearchParams.saved;
  const session = await requireChurchAccess(slug);
  const church = getChurchBySlug(slug);

  if (!church) {
    notFound();
  }

  const persistedMedia = await getPersistedChurchMediaBySlug(slug);
  const featuredImageUrl = persistedMedia?.featuredImageUrl ?? church.featuredImageUrl ?? "";
  const logoUrl = persistedMedia?.logoUrl ?? church.logoUrl ?? "";
  const previewImage =
    featuredImageUrl ||
    logoUrl ||
    "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1200&q=80";
  const memberships = await getPersistedMembershipsByEmail(session.user.email ?? "");
  const team = await getPersistedMembershipsByChurchSlug(slug);
  const claim = await getPersistedClaimRequestByChurchSlug(slug);
  const canAccessAdmin = session.user.role === "ADMIN" || session.user.role === "REVIEWER" || session.user.role === "SUPPORT";

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <ChurchDashboardSidebar memberships={memberships} canAccessAdmin={canAccessAdmin} />
        <div className="space-y-8 admin-shell rounded-[36px] border border-white/70 p-5 sm:p-8">
          <div className="section-strong rounded-[30px] border border-white/70 px-6 py-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">Church Workspace</p>
            <h1 className="mt-4 font-display text-5xl">{church.name}</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-600">
              Manage public listing details, invite staff editors, and route risky changes into review without exposing the full admin back office.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <span className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white">{church.city}</span>
              <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-stone-700 ring-1 ring-brand-100">
                Last updated {formatDate(church.lastUpdatedAt)}
              </span>
              <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-stone-700 ring-1 ring-brand-100">
                {church.claimed ? "Claimed listing" : "Pending claim setup"}
              </span>
            </div>
            {savedState ? (
              <div className="mt-5 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-900 ring-1 ring-brand-100">
                {savedState === "media" && "Church image saved."}
                {savedState === "record" && "Listing changes saved."}
              </div>
            ) : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-white/70 bg-gradient-to-br from-white via-brand-50 to-sky/30 p-8">
              <h2 className="font-display text-3xl">Listing editor</h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                This MVP stages a church-owned editing experience. Public-safe fields can be edited here; sensitive changes can be routed to review in the next persistence pass.
              </p>
              <div className="mt-8 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                <div className="space-y-4">
                  <div className="relative h-60 overflow-hidden rounded-[28px] border border-white/70 bg-white">
                    <Image src={previewImage} alt={church.name} fill className="object-cover" />
                  </div>
                  <ChurchMediaForm
                    action={saveChurchMediaAction}
                    churchSlug={church.slug}
                    returnPath={`/dashboard/churches/${church.slug}`}
                    featuredImageUrl={featuredImageUrl}
                    logoUrl={logoUrl}
                  />
                </div>
                <form action={saveChurchListingAction} className="grid gap-4 md:grid-cols-2">
                  <input type="hidden" name="churchSlug" value={church.slug} />
                  <input type="hidden" name="returnPath" value={`/dashboard/churches/${church.slug}`} />
                  <Input name="name" defaultValue={church.name} aria-label="Church name" />
                  <Input name="pastorFullName" defaultValue={church.pastor.fullName} aria-label="Lead pastor" />
                  <Input name="websiteUrl" defaultValue={church.websiteUrl} aria-label="Website URL" />
                  <Input name="phone" defaultValue={church.phone} aria-label="Public phone" />
                  <Input name="email" defaultValue={church.email} aria-label="Public email" />
                  <Input name="livestreamUrl" defaultValue={church.livestreamUrl} aria-label="Livestream URL" />
                  <div className="md:col-span-2">
                    <Textarea name="description" defaultValue={church.description} aria-label="Description" />
                  </div>
                  <div className="md:col-span-2 flex flex-wrap gap-3">
                    <Button type="submit">Save draft</Button>
                    <Button asChild variant="secondary">
                      <Link href={`/claim?church=${church.slug}`}>Request review</Link>
                    </Button>
                    <Button asChild variant="secondary">
                      <Link href={`/claim?church=${church.slug}`}>Invite editor</Link>
                    </Button>
                  </div>
                </form>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="border-white/70 bg-gradient-to-br from-white via-sky/20 to-brand-50 p-6">
                <h2 className="font-display text-2xl">Verification status</h2>
                {claim ? (
                  <div className="mt-4 rounded-2xl bg-white/80 p-4 ring-1 ring-brand-100">
                    <p className="font-semibold text-ink">{claim.status.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-sm text-stone-600">{claim.evidenceSummary}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-brand-700">
                      {claim.verificationMethod.replaceAll("_", " ")} • submitted {formatDate(claim.submittedAt)}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-stone-600">No open claim request. This church is already in the active management pool.</p>
                )}
              </Card>

              <Card className="border-white/70 bg-gradient-to-br from-white via-brand-50 to-rose/10 p-6">
                <h2 className="font-display text-2xl">Team access</h2>
                <div className="mt-4 space-y-3">
                  {team.map((member) => (
                    <div key={member.id} className="rounded-2xl bg-white/80 p-4 ring-1 ring-brand-100">
                      <p className="font-semibold text-ink">{member.userName}</p>
                      <p className="mt-1 text-sm text-stone-600">
                        {member.userEmail} • {member.role === "CHURCH_OWNER" ? "Owner" : "Editor"}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
