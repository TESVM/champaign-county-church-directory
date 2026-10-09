import { submitCorrectionAction } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { CORRECTION_FIELDS } from "@/lib/services/inbox";

export function CorrectionForm({ churchSlug, churchName }: { churchSlug: string; churchName: string }) {
  return (
    <ActionForm action={submitCorrectionAction} resetOnSuccess honeypot fieldLabels={{ details: "What is out of date", reporterEmail: "Your email" }}>
      <input type="hidden" name="churchSlug" value={churchSlug} />
      <SelectField
        name="fieldName"
        label="What needs correcting?"
        defaultValue="serviceTimes"
        options={CORRECTION_FIELDS.map((f) => ({ value: f.value, label: f.label }))}
      />
      <TextAreaField name="details" label={`What is out of date on ${churchName}?`} required hint="If you know the correct details, include them and where you saw them." />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="reporterName" label="Your name (optional)" autoComplete="name" />
        <TextField name="reporterEmail" label="Your email (optional)" type="email" autoComplete="email" hint="Only used if we have a question." />
      </div>
      <SubmitButton pendingLabel="Sending…">Send report</SubmitButton>
    </ActionForm>
  );
}
