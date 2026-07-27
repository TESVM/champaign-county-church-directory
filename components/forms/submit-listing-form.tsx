import { submitListingAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";

export function SubmitListingForm() {
  return (
    <form action={submitListingAction} className="space-y-6">
      <p className="text-sm leading-6 text-stone-600">
        Fields marked with an asterisk are required. We review every submission
        before it appears in the directory.
      </p>

      <div className="grid gap-5 md:grid-cols-2">
        <TextField name="churchName" label="Church name" required autoComplete="organization" />
        <TextField name="city" label="City" required autoComplete="address-level2" />
        <TextField name="contactName" label="Your name" required autoComplete="name" />
        <TextField
          name="contactEmail"
          label="Your email"
          type="email"
          required
          autoComplete="email"
          hint="We use this only to follow up about this listing."
        />
        <TextField
          name="websiteUrl"
          label="Website address"
          type="url"
          inputMode="url"
          placeholder="https://example.org"
        />
        <TextField
          name="appUrl"
          label="Church app address"
          type="url"
          inputMode="url"
          placeholder="https://example.org/app"
        />
        <TextField name="seniorPastor" label="Senior pastor" required />
        <TextField
          name="serviceTimes"
          label="Service times"
          required
          hint="For example: Sunday 9:00 AM and 11:00 AM, Wednesday 6:30 PM"
        />
      </div>

      <TextAreaField
        name="description"
        label="About the church"
        required
        hint="Ministries, worship style, and anything a visitor should know. At least 20 characters."
      />

      <Button type="submit">Submit for review</Button>
    </form>
  );
}
