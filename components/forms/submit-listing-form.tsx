import { submitListingAction } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";

export function SubmitListingForm({ cities }: { cities: Array<{ slug: string; name: string }> }) {
  return (
    <ActionForm
      action={submitListingAction}
      honeypot
      resetOnSuccess
      fieldLabels={{ churchName: "Church name", citySlug: "City", address1: "Street address", serviceTimes: "Service times", contactName: "Your name", contactEmail: "Your email", websiteUrl: "Website", churchEmail: "Church email" }}
    >
      <p className="text-sm leading-6 text-stone-600">Fields marked with an asterisk are required. Please only submit details you know to be accurate.</p>
      <fieldset className="space-y-5">
        <legend className="font-display text-2xl">The church</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="churchName" label="Church name" required />
          <SelectField name="citySlug" label="City" required defaultValue="" options={[{ value: "", label: "Choose a city…" }, ...cities.map((c) => ({ value: c.slug, label: c.name }))]} />
          <TextField name="address1" label="Street address" required autoComplete="street-address" />
          <TextField name="zip" label="ZIP code" inputMode="numeric" autoComplete="postal-code" />
          <TextField name="phone" label="Church phone" type="tel" />
          <TextField name="churchEmail" label="Church email" type="email" />
          <TextField name="websiteUrl" label="Website" type="url" placeholder="https://" />
          <TextField name="denomination" label="Denomination" />
          <TextField name="seniorPastor" label="Lead pastor" />
        </div>
        <TextAreaField name="serviceTimes" label="Service times" required hint="One per line, e.g. “Sunday 10:30 AM” or “Wednesday 7:00 PM Bible study”." />
        <TextAreaField name="description" label="Short description" hint="A sentence or two visitors would find helpful." />
      </fieldset>
      <fieldset className="space-y-5">
        <legend className="font-display text-2xl">About you</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="contactName" label="Your name" required autoComplete="name" />
          <TextField name="contactEmail" label="Your email" type="email" required autoComplete="email" hint="We email you when it is published. Not shown publicly." />
        </div>
        <TextField name="relationship" label="Your connection to the church" placeholder="Member, pastor, neighbour…" />
      </fieldset>
      <SubmitButton pendingLabel="Submitting…">Submit for review</SubmitButton>
    </ActionForm>
  );
}
