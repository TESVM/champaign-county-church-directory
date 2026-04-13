import { FormShell } from "@/components/forms/form-shell";
import { SubmitListingForm } from "@/components/forms/submit-listing-form";

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <FormShell title="Submit a Church Listing" description="Churches can submit a new listing, request corrections, and provide pastor, website, app, service, and ministry information for admin review.">
        <SubmitListingForm />
      </FormShell>
    </div>
  );
}
