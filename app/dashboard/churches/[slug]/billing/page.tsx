import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { openPortalAction, startCheckoutAction } from "@/app/actions";
import { ChurchTabs } from "@/components/dashboard/church-tabs";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { loadManagedChurch } from "@/lib/dashboard";
import { ENHANCED_ANNUAL_PRICE_DOLLARS, ENHANCED_ANNUAL_SAVINGS_DOLLARS, ENHANCED_FEATURES, ENHANCED_PRICE_DOLLARS } from "@/lib/plans";
import { annualPlanAvailable, billingConfigured, getBillingSummary, planForPrice } from "@/lib/services/billing";
import { formatDate } from "@/lib/utils";

const STATUS_TEXT: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Payment failed — Stripe is retrying. Update your card to keep features on.",
  unpaid: "Unpaid — features are off",
  canceled: "Cancelled",
  incomplete: "Checkout not finished",
  incomplete_expired: "Checkout expired"
};

export default async function BillingPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ checkout?: string }> }) {
  const { slug } = await params;
  const { checkout } = await searchParams;
  const { church, canManage } = await loadManagedChurch(slug, "/billing");
  if (!canManage) redirect(`/dashboard/churches/${slug}`);
  const billing = await getBillingSummary(church.id);
  const sub = billing.subscription;
  const configured = billingConfigured();
  const annual = annualPlanAvailable();

  return (
    <>
      <ChurchTabs slug={slug} current="/billing" canManage={canManage} />
      {checkout === "success" ? (
        <p role="status" className="mt-6 rounded-2xl bg-sky/60 p-4 text-sm text-brand-900">
          Thank you. Stripe is confirming your payment. Features switch on as soon as Stripe notifies us, usually within a minute.
          {billing.active ? " Your enhanced profile is active." : " Refresh this page shortly to see the updated status."}
        </p>
      ) : null}
      {checkout === "cancelled" ? <p role="status" className="mt-6 rounded-2xl bg-brand-50 p-4 text-sm">Checkout was cancelled. Nothing was charged.</p> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="p-6">
          <h2 className="font-display text-2xl">Current plan</h2>
          <p className="mt-3 text-lg font-semibold">{billing.active ? "Enhanced Church Profile" : "Free listing"}</p>
          {billing.source === "complimentary" ? (
            <p className="mt-1 text-sm text-stone-700">
              Complimentary{billing.complimentaryUntil && billing.complimentaryUntil.getFullYear() < 2099 ? ` until ${formatDate(billing.complimentaryUntil.toISOString())}` : ""}, granted by the directory. No payment is taken.
            </p>
          ) : null}
          {sub ? (
            <dl className="mt-4 space-y-1 text-sm text-stone-700">
              <div><dt className="inline font-semibold">Subscription: </dt><dd className="inline">{STATUS_TEXT[sub.status] ?? sub.status}</dd></div>
              <div><dt className="inline font-semibold">Billing: </dt><dd className="inline">{planForPrice(sub.priceId) === "annual" ? `Annual ($${ENHANCED_ANNUAL_PRICE_DOLLARS}/year)` : `Monthly ($${ENHANCED_PRICE_DOLLARS}/month)`}</dd></div>
              {sub.currentPeriodEnd ? (
                <div><dt className="inline font-semibold">{sub.cancelAtPeriodEnd || sub.status === "canceled" ? "Ends" : "Renews"}: </dt><dd className="inline">{formatDate(sub.currentPeriodEnd.toISOString())}</dd></div>
              ) : null}
            </dl>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            {sub?.stripeCustomerId && configured ? (
              <ActionForm action={openPortalAction}>
                <input type="hidden" name="churchId" value={church.id} />
                <SubmitButton variant="secondary" pendingLabel="Opening…">Manage billing, invoices, or cancel</SubmitButton>
              </ActionForm>
            ) : null}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-2xl">Enhanced Church Profile — ${ENHANCED_PRICE_DOLLARS}/month</h2>
          <ul className="mt-4 space-y-2">
            {ENHANCED_FEATURES.map((f) => (
              <li key={f.key} className="flex gap-2 text-sm text-stone-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                <span><span className="font-semibold">{f.label}.</span> {f.detail}</span>
              </li>
            ))}
          </ul>
          {annual ? (
            <p className="mt-4 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
              <span className="font-semibold">Pay yearly and get a month free:</span> ${ENHANCED_ANNUAL_PRICE_DOLLARS} a year instead of ${ENHANCED_PRICE_DOLLARS * 12}. That is 12 months for the price of 11, a savings of ${ENHANCED_ANNUAL_SAVINGS_DOLLARS}.
            </p>
          ) : null}
          <p className="mt-4 text-sm text-stone-600">Cancel any time; features stay on to the end of the period you paid for. <Link className="underline" href="/terms">Subscription terms</Link>.</p>
          {billing.source !== "subscription" ? (
            configured ? (
              <div className="mt-5">
                <ActionForm action={startCheckoutAction}>
                  <input type="hidden" name="churchId" value={church.id} />
                  <div className="flex flex-wrap gap-3">
                    {annual ? (
                      <SubmitButton name="plan" value="annual" pendingLabel="Opening checkout…">
                        Pay yearly: ${ENHANCED_ANNUAL_PRICE_DOLLARS}/year (1 month free)
                      </SubmitButton>
                    ) : null}
                    <SubmitButton name="plan" value="monthly" variant={annual ? "secondary" : "primary"} pendingLabel="Opening checkout…">
                      {annual ? `Pay monthly: $${ENHANCED_PRICE_DOLLARS}/month` : "Subscribe with Stripe"}
                    </SubmitButton>
                  </div>
                </ActionForm>
              </div>
            ) : (
              <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">Online payment is not switched on yet. Contact the directory to enable your enhanced profile.</p>
            )
          ) : null}
        </Card>
      </div>
    </>
  );
}
