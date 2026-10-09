import { submitContactAction } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { TextAreaField, TextField } from "@/components/ui/field";

export function ContactForm() {
  return (
    <ActionForm action={submitContactAction} honeypot resetOnSuccess fieldLabels={{ name: "Your name", email: "Your email" }}>
      <p className="text-sm leading-6 text-stone-600">Fields marked with an asterisk are required.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="name" label="Your name" required autoComplete="name" />
        <TextField name="email" label="Your email" type="email" required autoComplete="email" />
      </div>
      <TextField name="organization" label="Church or organisation" autoComplete="organization" />
      <TextAreaField name="message" label="Message" required hint="At least 10 characters. To fix a specific listing, “Report outdated information” on that church’s page is fastest." />
      <SubmitButton pendingLabel="Sending…">Send message</SubmitButton>
    </ActionForm>
  );
}
