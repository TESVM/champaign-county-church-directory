import Link from "next/link";
import { addPublicOrganizationAction } from "@/app/actions";
import { CheckboxGroup } from "@/components/campus/checkbox-group";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { TextAreaField, TextField } from "@/components/ui/field";
import { requireReviewer } from "@/lib/auth-guards";
import { CAMPUSES } from "@/lib/campus";

export default async function AddPublicOrganizationPage() {
  await requireReviewer("/admin/campus/new");
  return (
    <div className="space-y-5">
      <p className="text-sm">
        <Link href="/admin/campus" className="underline">
          Campus Faith
        </Link>{" "}
        / Add from a public source
      </p>
      <h1 className="font-display text-4xl">Add a ministry from its public pages</h1>
      <p className="text-sm text-stone-700">
        Use only what the organization says about itself on its own site or official campus listing, and link that page. It is published right away, labeled “Compiled from public pages”. Meeting times are left out because they change each
        semester; the organization can add them when it claims the listing.
      </p>
      <Card className="p-6">
        <ActionForm action={addPublicOrganizationAction} resetOnSuccess fieldLabels={{ sourceUrl: "Source page" }}>
          <TextField name="name" label="Organization name" required />
          <CheckboxGroup name="campuses" legend="Campuses served (as stated by the source)" options={CAMPUSES.map((c) => [c.key, c.short] as const)} required columns={3} />
          <TextField name="affiliation" label="Affiliation (as stated)" />
          <TextAreaField name="description" label="Description (from the source)" required rows={4} />
          <TextField name="meetingLocation" label="Ministry center or address (optional, as stated)" />
          <div className="grid gap-4 md:grid-cols-2">
            <TextField name="sourceUrl" label="Source page" type="url" required />
            <TextField name="websiteUrl" label="Website" type="url" />
            <TextField name="instagramUrl" label="Instagram" type="url" />
            <TextField name="facebookUrl" label="Facebook" type="url" />
          </div>
          <SubmitButton>Publish listing</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
