import type { Metadata } from "next";
import { ClaimForm } from "@/components/forms/claim-form";
import { FormShell } from "@/components/forms/form-shell";
import { listChurchOptions } from "@/lib/services/churches";

export const metadata: Metadata = {
  title: "Manage Your Church’s Listing",
  description: "Church leaders can request free access to keep their listing in the Champaign County Church Directory current.",
  alternates: { canonical: "/claim" }
};

export default async function ClaimPage({ searchParams }: { searchParams: Promise<{ church?: string }> }) {
  const { church } = await searchParams;
  const churches = await listChurchOptions();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <FormShell
        title="Request to manage your church’s listing"
        description="For pastors and staff. Once approved you can update service times, add visitor information, invite colleagues, and see activity counts. It is free."
      >
        <ClaimForm churches={churches} churchSlug={churches.some((c) => c.slug === church) ? church : undefined} />
      </FormShell>
    </div>
  );
}
