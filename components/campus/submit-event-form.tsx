"use client";

import { submitCampusEventAction } from "@/app/actions";
import { CheckboxGroup } from "@/components/campus/checkbox-group";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { CAMPUSES, EVENT_CATEGORIES } from "@/lib/campus";

export function SubmitEventForm({ organizations }: { organizations: Array<{ slug: string; name: string }> }) {
  return (
    <ActionForm action={submitCampusEventAction} honeypot resetOnSuccess fieldLabels={{ startDate: "Date", startTime: "Start time", endTime: "End time", hostName: "Host", submitterEmail: "Your email", registrationUrl: "Sign-up link" }}>
      <p className="text-sm leading-6 text-stone-600">Events appear on the student calendar after a reviewer approves them. Times are Central Time.</p>
      <TextField name="title" label="Event title" required />
      <div className="grid gap-5 md:grid-cols-2">
        <SelectField name="organizationSlug" label="Hosting organization" defaultValue="" options={[{ value: "", label: "Not listed / someone else" }, ...organizations.map((o) => ({ value: o.slug, label: o.name }))]} />
        <TextField name="hostName" label="Host name (if not in the list)" />
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <TextField name="startDate" label="Date" type="date" required />
        <TextField name="startTime" label="Start time" type="time" />
        <TextField name="endTime" label="End time" type="time" />
      </div>
      <TextField name="location" label="Location" placeholder="Building, room, or address" />
      <TextAreaField name="description" label="Description" rows={4} />
      <TextField name="registrationUrl" label="Sign-up link, if any" type="url" placeholder="https://" />
      <CheckboxGroup name="categories" legend="Kind of event" options={EVENT_CATEGORIES} required columns={2} />
      <CheckboxGroup name="campuses" legend="For students at" options={CAMPUSES.map((c) => [c.key, c.short] as const)} required columns={3} />
      <div className="grid gap-5 md:grid-cols-2">
        <TextField name="submitterName" label="Your name" required autoComplete="name" />
        <TextField name="submitterEmail" label="Your email" type="email" required autoComplete="email" hint="Not shown publicly." />
      </div>
      <SubmitButton pendingLabel="Submitting…">Submit event for review</SubmitButton>
    </ActionForm>
  );
}
