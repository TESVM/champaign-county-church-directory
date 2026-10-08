import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { billingIsConfigured, PREMIUM_PROFILE_PRICE_DOLLARS, premiumProfileFeatures } from "@/lib/billing";
import { fetchChurchBySlug } from "@/lib/data/source";

export default async function ChurchUpgradePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const church = await fetchChurchBySlug(slug);
  if (!church) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">Church profile upgrade</p>
        <h1 className="mt-4 font-display text-4xl sm:text-6xl">Turn visitors into Sunday guests</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-stone-600">
          Unlock the full public profile for {church.name}. Core directory information stays free; the enhanced plan adds the tools visitors use to connect and plan a visit.
        </p>
      </div>

      <Card className="mx-auto mt-10 max-w-3xl border-brand-200 bg-gradient-to-br from-white via-brand-50 to-sky/30 p-7 shadow-soft sm:p-10">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Enhanced church profile</p>
            <p className="mt-3"><span className="font-display text-5xl">${PREMIUM_PROFILE_PRICE_DOLLARS}</span><span className="text-stone-600"> / month</span></p>
            <p className="mt-2 text-sm text-stone-600">Monthly billing. Cancel anytime.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-900 ring-1 ring-brand-100">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Secure billing
          </div>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {premiumProfileFeatures.map((feature) => (
            <li key={feature} className="flex gap-3 text-stone-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800"><Check className="h-4 w-4" /></span>
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-9 border-t border-brand-100 pt-7">
          {church.premiumProfile ? (
            <p className="rounded-2xl bg-brand-100 px-5 py-4 font-semibold text-brand-900">This church already has an active enhanced profile.</p>
          ) : church.claimed ? (
            billingIsConfigured() ? (
              <form action="/api/billing/checkout" method="post">
                <input type="hidden" name="churchSlug" value={church.slug} />
                <Button type="submit" size="lg" className="w-full">Start monthly plan</Button>
              </form>
            ) : (
              <div className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-950 ring-1 ring-amber-200">
                Billing is ready for connection. Add the Stripe price and webhook credentials listed in the project billing notes to enable checkout.
              </div>
            )
          ) : (
            <div>
              <p className="text-sm leading-6 text-stone-600">For security, a pastor or authorized leader must claim and verify this church before starting a paid plan.</p>
              <Button asChild size="lg" className="mt-4 w-full"><Link href={`/claim?church=${church.slug}`}>Claim this church first</Link></Button>
            </div>
          )}
        </div>
      </Card>
    </main>
  );
}
