import { FormShell } from "@/components/forms/form-shell";
import { ClaimForm } from "@/components/forms/claim-form";
import { getChurchBySlug } from "@/lib/data/queries";

export default async function ClaimPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const slug = Array.isArray(resolvedSearchParams.church) ? resolvedSearchParams.church[0] : resolvedSearchParams.church;
  const submitted = Array.isArray(resolvedSearchParams.submitted) ? resolvedSearchParams.submitted[0] : resolvedSearchParams.submitted;
  const church = slug ? getChurchBySlug(slug) : undefined;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <FormShell
        title="Claim a Church Listing"
        description="Church staff can claim an existing listing to verify details, manage updates, invite editors, and keep public information accurate without touching code."
      >
        {submitted ? (
          <div className="mb-6 rounded-[24px] bg-sage/15 px-5 py-4 text-sm leading-6 text-sage">
            Claim request received. If database persistence is configured, it has been added to the review queue. If not, the form still validated and the workflow UI remains available.
          </div>
        ) : null}
        <ClaimForm churchName={church?.name} churchSlug={church?.slug} />
      </FormShell>
    </div>
  );
}
