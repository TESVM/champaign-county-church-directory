"use client";

import { submitCollabPostAction } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { COLLAB_CATEGORIES, MAX_POST_DAYS } from "@/lib/collab";

export function CollabPostForm({ churches, staff, defaultChurchId, defaultEnd }: { churches: Array<{ id: string; name: string }>; staff: boolean; defaultChurchId?: string; defaultEnd: string }) {
  return (
    <ActionForm action={submitCollabPostAction} resetOnSuccess fieldLabels={{ churchId: "Posting for", organizationName: "Ministry name", expiresOn: "Take down on", contactEmail: "Contact email", contactPhone: "Contact phone", contactUrl: "Contact link", consent: "Permission to show contact details" }}>
      <SelectField
        name="churchId"
        label="Posting for"
        defaultValue={defaultChurchId ?? churches[0]?.id ?? ""}
        options={[...churches.map((c) => ({ value: c.id, label: c.name })), ...(staff ? [{ value: "", label: "A ministry without a church listing (staff)" }] : [])]}
      />
      {staff ? <TextField name="organizationName" label="Ministry name (only when not posting for a church)" /> : null}
      <SelectField name="category" label="Category" required defaultValue="" options={[{ value: "", label: "Choose…" }, ...COLLAB_CATEGORIES.map(([value, label]) => ({ value, label }))]} />
      <TextField name="title" label="Title" required placeholder="Volunteers needed for Saturday food distribution" />
      <TextAreaField name="body" label="Details" required rows={5} hint="What is needed or offered, when, and how others can help. Please do not include anyone’s private information or prayer requests." />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField name="location" label="Location (optional)" />
        <TextField name="expiresOn" label="Take down on" type="date" required defaultValue={defaultEnd} hint={`Up to ${MAX_POST_DAYS} days from today.`} />
      </div>
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-stone-800">How should people respond? (at least one)</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="contactName" label="Contact name" />
          <TextField name="contactEmail" label="Contact email" type="email" />
          <TextField name="contactPhone" label="Contact phone" type="tel" />
          <TextField name="contactUrl" label="Sign-up or info link" type="url" placeholder="https://" />
        </div>
      </fieldset>
      <label id="field-consent" className="flex min-h-[44px] items-start gap-3 text-sm text-stone-800">
        <input type="checkbox" name="consent" value="true" required className="mt-0.5 h-5 w-5 shrink-0 rounded border-line" />
        These contact details may be shown publicly, and I have permission from anyone named.
      </label>
      <SubmitButton pendingLabel="Sending…">Submit for review</SubmitButton>
    </ActionForm>
  );
}
