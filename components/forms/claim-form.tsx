import { submitClaimAction } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";

export function ClaimForm({ churches, churchSlug }: { churches: Array<{ slug: string; name: string; city: string }>; churchSlug?: string }) {
  return (
    <ActionForm
      action={submitClaimAction}
      honeypot
      resetOnSuccess
      fieldLabels={{ churchSlug: "Church", contactName: "Your name", contactEmail: "Your email", role: "Your role", verificationMethod: "Verification method", evidence: "Proof of authorisation" }}
    >
      <p className="text-sm leading-6 text-stone-600">Fields marked with an asterisk are required.</p>
      <SelectField
        name="churchSlug"
        label="Church"
        required
        defaultValue={churchSlug ?? ""}
        options={[{ value: "", label: "Choose your church…" }, ...churches.map((c) => ({ value: c.slug, label: `${c.name} — ${c.city}` }))]}
        hint="Not listed? Submit the church first, then request to manage it."
      />
      <div className="grid gap-5 md:grid-cols-2">
        <TextField name="contactName" label="Your name" required autoComplete="name" />
        <TextField name="contactEmail" label="Your email" type="email" required autoComplete="email" hint="An address on the church’s own domain is the fastest to verify. This is the address you will sign in with." />
        <TextField name="phone" label="Your direct phone" type="tel" autoComplete="tel" />
        <TextField name="role" label="Your role at the church" required placeholder="Pastor, office administrator…" />
      </div>
      <SelectField
        name="verificationMethod"
        label="How should we verify you?"
        required
        defaultValue="DOMAIN_EMAIL"
        options={[
          { value: "DOMAIN_EMAIL", label: "My email is on the church’s website domain" },
          { value: "PUBLIC_PHONE", label: "Call the church’s public phone number to confirm" },
          { value: "MANUAL_REVIEW", label: "Other evidence (described below)" }
        ]}
      />
      <TextAreaField
        name="evidence"
        label="How can we confirm you are authorised to manage this listing?"
        required
        hint="For example: a staff page that lists you, who we should ask for when we call, or another public source."
      />
      <p className="rounded-2xl bg-brand-50 p-4 text-sm leading-6 text-stone-700">
        A reviewer checks every request before granting access. You will get an email with the result. Managing a listing is free.
      </p>
      <SubmitButton pendingLabel="Sending…">Request access</SubmitButton>
    </ActionForm>
  );
}
