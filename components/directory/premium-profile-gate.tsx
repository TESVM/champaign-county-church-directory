import Link from "next/link";
import { Check, LockKeyhole } from "lucide-react";
import { PREMIUM_PROFILE_PRICE_DOLLARS, premiumProfileFeatures } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function PremiumProfileGate({ churchSlug }: { churchSlug: string }) {
  return (
    <Card className="relative overflow-hidden border-amber-200 bg-gradient-to-br from-amber-50 via-white to-brand-50 p-6 sm:p-8">
      <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-amber-200/50 blur-2xl" />
      <div className="relative">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-900 text-white">
          <LockKeyhole className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Enhanced profile</p>
        <h2 className="mt-2 font-display text-3xl">Help visitors connect before Sunday</h2>
        <p className="mt-3 max-w-2xl leading-7 text-stone-600">
          This church has a free directory listing. Church leadership can unlock its digital links, ministry details, leadership profiles, and visitor map for ${PREMIUM_PROFILE_PRICE_DOLLARS} per month.
        </p>
        <ul className="mt-5 grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
          {premiumProfileFeatures.map((feature) => (
            <li key={feature} className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href={`/churches/${churchSlug}/upgrade`}>Unlock profile features</Link>
          </Button>
          <span className="text-sm font-semibold text-stone-600">Cancel anytime</span>
        </div>
      </div>
    </Card>
  );
}
