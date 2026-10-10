import type { Metadata } from "next";
import { SectionHeading } from "@/components/layout/section-heading";
import { Card } from "@/components/ui/card";
import { env } from "@/lib/env";
import { ENHANCED_PRICE_DOLLARS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Subscription Terms",
  alternates: { canonical: "/terms" }
};

/**
 * Describes how billing actually works in the code. Items marked for owner
 * review in docs/LAUNCH_CHECKLIST.md (refunds, legal entity, governing law)
 * must be confirmed by the business owner before launch.
 */
export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading as="h1" eyebrow="For church leaders" title="Enhanced Church Profile: subscription terms" description="Plain-language summary of how the paid plan works." />
      <Card className="mt-8 space-y-5 p-6 text-sm leading-7 text-stone-700 sm:p-8">
        <section>
          <h2 className="font-display text-2xl text-ink">Price and billing</h2>
          <p>
            The Enhanced Church Profile costs ${ENHANCED_PRICE_DOLLARS} per month (US dollars), charged to a card through Stripe at the start of each
            monthly period. We never see or store your full card number. Receipts and invoices are available from “Manage billing” in your dashboard.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-ink">Who can subscribe</h2>
          <p>Only an approved owner of a church listing (or a directory administrator) can start, change, or cancel a subscription for that church.</p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-ink">Cancelling</h2>
          <p>
            Cancel any time from “Manage billing”. Enhanced features stay on until the end of the month you have paid for, then switch off. The
            church’s free listing, service times, and visitor information remain published.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-ink">Failed payments</h2>
          <p>
            If a renewal payment fails, Stripe retries it over the following days and emails the billing contact. Features stay on while payment is
            being retried. If payment cannot be collected, the subscription ends and enhanced features switch off.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-ink">Refunds</h2>
          <p>Payments are not prorated or refunded for partial months unless required by law. Contact us if you believe you were charged in error.</p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-ink">Price changes</h2>
          <p>We will email subscribers at least 30 days before any price change takes effect.</p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-ink">Questions</h2>
          <p>{env.supportEmail ? <>Email <a className="underline" href={`mailto:${env.supportEmail}`}>{env.supportEmail}</a> or use the contact page.</> : "Use the contact page."}</p>
        </section>
      </Card>
    </div>
  );
}
