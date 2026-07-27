import { claimListingAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";

export function ClaimForm({
  churchName,
  churchSlug
}: {
  churchName?: string;
  churchSlug?: string;
}) {
  return (
    <form action={claimListingAction} className="space-y-6">
      <input type="hidden" name="churchSlug" value={churchSlug ?? ""} />

      <p className="text-sm leading-6 text-stone-600">
        Fields marked with an asterisk are required.
      </p>

      <div className="grid gap-5 md:grid-cols-2">
        <TextField
          name="churchName"
          label="Church name"
          required
          defaultValue={churchName}
          autoComplete="organization"
        />
        <TextField name="contactName" label="Your name" required autoComplete="name" />
        <TextField
          name="contactEmail"
          label="Your email"
          type="email"
          required
          autoComplete="email"
          hint="Using an address on the church's own domain speeds up verification."
        />
        <TextField name="phone" label="Your direct phone" type="tel" autoComplete="tel" />
        <TextField name="role" label="Your role at the church" required />
        <SelectField
          name="verificationMethod"
          label="How should we verify you?"
          required
          defaultValue="DOMAIN_EMAIL"
          options={[
            { value: "DOMAIN_EMAIL", label: "Church email domain" },
            { value: "PUBLIC_PHONE", label: "Call the church's public phone" },
            { value: "MANUAL_REVIEW", label: "Manual review with evidence" }
          ]}
        />
      </div>

      <TextAreaField
        name="evidence"
        label="Proof you are authorised to manage this listing"
        required
        hint="An official email domain, a staff page listing you, a public phone number, or another source we can check."
      />

      <TextAreaField
        name="message"
        label="How are you connected to this church?"
        required
        hint="Tell us what needs updating."
      />

      <div className="rounded-2xl bg-brand-50 p-4 text-sm leading-6 text-stone-700">
        Claims are approved only after a verification step that reasonably proves
        pastor or delegated staff authorisation.
      </div>

      <Button type="submit">Request claim review</Button>
    </form>
  );
}
