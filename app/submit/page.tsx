import type { Metadata } from "next";
import { FormShell } from "@/components/forms/form-shell";
import { SubmitListingForm } from "@/components/forms/submit-listing-form";
import { listCities } from "@/lib/services/churches";

export const metadata: Metadata = {
  title: "Submit a Church",
  description: "Suggest a Champaign County church that is missing from the directory.",
  alternates: { canonical: "/submit" }
};

export default async function SubmitPage() {
  const cities = await listCities({ includeEmpty: true });
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <FormShell
        title="Submit a church"
        description="Know a Champaign County church that is not listed? Send us the details. A reviewer checks for duplicates and publishes it, and we email you when it is live. To fix an existing listing, use “Report outdated information” on its page."
      >
        <SubmitListingForm cities={cities} />
      </FormShell>
    </div>
  );
}
