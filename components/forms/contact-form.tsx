import { submitContactAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";

export function ContactForm() {
  return (
    <form action={submitContactAction} className="space-y-6">
      <p className="text-sm leading-6 text-stone-600">
        Fields marked with an asterisk are required.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="name" label="Your name" required autoComplete="name" />
        <TextField name="email" label="Your email" type="email" required autoComplete="email" />
      </div>

      <TextField name="organization" label="Church or organisation" autoComplete="organization" />

      <TextAreaField
        name="message"
        label="Message"
        required
        hint="Tell us what needs correcting, or what you need help with. At least 10 characters."
      />

      <Button type="submit">Send message</Button>
    </form>
  );
}
