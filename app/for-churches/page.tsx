import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { SectionHeading } from "@/components/layout/section-heading";
import { Card } from "@/components/ui/card";
import { annualPlanAvailable } from "@/lib/services/billing";
import { ENHANCED_ANNUAL_PRICE_DOLLARS, ENHANCED_FEATURES, ENHANCED_PRICE_DOLLARS, FREE_FEATURES } from "@/lib/plans";

export const metadata: Metadata = {
  title: "For Churches: Free and Enhanced Listings",
  description: `Every Champaign County church gets a free listing. The Enhanced Church Profile adds promotion tools for $${ENHANCED_PRICE_DOLLARS} a month.`,
  alternates: { canonical: "/for-churches" }
};

export default async function ForChurchesPage({ searchParams }: { searchParams: Promise<{ church?: string }> }) {
  const annual = annualPlanAvailable();
  const { church } = await searchParams;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        as="h1"
        eyebrow="For church leaders"
        title="Keep your listing accurate, and help visitors find you"
        description="Every congregation in Champaign County is listed free. Church leaders can request access to manage their listing at no cost, and optionally add the Enhanced Church Profile."
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card className="p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Free listing</p>
          <p className="mt-2 font-display text-4xl">$0</p>
          <p className="mt-2 text-sm text-stone-600">For every church, managed or not.</p>
          <ul className="mt-6 space-y-3">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2 text-sm text-stone-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>
          <Link href={church ? `/claim?church=${church}` : "/claim"} className="mt-8 inline-flex min-h-[44px] items-center rounded-full bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-700 focus-ring">
            Request to manage your listing
          </Link>
        </Card>

        <Card className="border-brand-300 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Enhanced Church Profile</p>
          <p className="mt-2 font-display text-4xl">
            ${ENHANCED_PRICE_DOLLARS}
            <span className="text-lg text-stone-600"> / month</span>
          </p>
          {annual ? (
            <p className="mt-1 text-sm font-semibold text-brand-900">
              or ${ENHANCED_ANNUAL_PRICE_DOLLARS} / year: get one month free
            </p>
          ) : null}
          <p className="mt-2 text-sm text-stone-600">Everything in the free listing, plus:</p>
          <ul className="mt-6 space-y-3">
            {ENHANCED_FEATURES.map((f) => (
              <li key={f.key} className="flex gap-2 text-sm text-stone-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                <span>
                  <span className="font-semibold text-ink">{f.label}.</span> {f.detail}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm leading-6 text-stone-600">
            Billed {annual ? "monthly or yearly" : "monthly"} by card through Stripe. Cancel any time from your dashboard; features stay on until the end of the period you paid for. Your
            free listing is never removed if you cancel. See the <Link href="/terms" className="underline">subscription terms</Link>.
          </p>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Subscribing is available after your request to manage the listing is approved. Only the listing’s owner can start or change billing.
          </p>
        </Card>
      </div>

      <Card className="mt-10 p-6 sm:p-8">
        <h2 className="font-display text-3xl">How managing a listing works</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-stone-700">
          <li>Find your church and choose “Manage this listing”, or use the claim form.</li>
          <li>A reviewer confirms you are authorised, for example through an email on the church’s own domain or a call to the church’s public number.</li>
          <li>Once approved, sign in with your email. We send a one-time link; there is no password.</li>
          <li>Update service times, add “Plan your first visit” details, invite other staff as editors, and see activity counts.</li>
        </ol>
        <p className="mt-4 text-sm text-stone-600">
          Activity counts show how often your listing was viewed and how often visitors tapped directions, website, phone, and other links. They are
          counts of actions on this site, not visits to your church or attendance.
        </p>
      </Card>
    </div>
  );
}
