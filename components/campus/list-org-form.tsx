"use client";

import { submitOrganizationAction } from "@/app/actions";
import { CheckboxGroup } from "@/components/campus/checkbox-group";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { TextAreaField, TextField } from "@/components/ui/field";
import { CAMPUSES, MEETING_TYPES } from "@/lib/campus";

const campusOptions = CAMPUSES.map((c) => [c.key, c.short === "Other students" ? "Other / community college students" : c.label] as const);

export function ListOrgForm() {
  return (
    <ActionForm
      action={submitOrganizationAction}
      honeypot
      resetOnSuccess
      fieldLabels={{ consentToPublish: "Permission to publish", submitterEmail: "Your email", submitterRole: "Your role", logoUrl: "Logo link", otherSocialUrl: "Other link", registrationUrl: "Sign-up link" }}
    >
      <p className="text-sm leading-6 text-stone-600">Listing is free. Fields marked with an asterisk are required. A reviewer checks every listing before it is published, and we email you when it is live.</p>

      <fieldset className="space-y-5">
        <legend className="font-display text-2xl">Your organization</legend>
        <TextField name="name" label="Organization name" required />
        <CheckboxGroup name="campuses" legend="Campus or campuses served" options={campusOptions} required columns={1} />
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="affiliation" label="Denomination or ministry affiliation" hint="For example, a national ministry or “Independent”." />
          <TextField name="churchPartner" label="Church partner, if any" />
        </div>
        <TextAreaField name="description" label="Description" required hint="What you are about and what students can expect. At least 20 characters." rows={5} />
        <TextAreaField name="whoIsWelcome" label="Who is welcome" hint="For example: “All students, any background or major.”" rows={2} />
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="font-display text-2xl">When and where you meet</legend>
        <div className="grid gap-5 md:grid-cols-3">
          <TextField name="meetingDay" label="Meeting day" placeholder="Thursdays" />
          <TextField name="meetingTime" label="Time" placeholder="7:00 PM" />
          <TextField name="meetingLocation" label="Location" placeholder="Building and room" />
        </div>
        <CheckboxGroup name="meetingTypes" legend="What happens when you meet" options={MEETING_TYPES} columns={3} />
        <TextAreaField name="firstTimeNote" label="What first-time visitors should know" rows={3} />
        <TextAreaField name="accessibilityNote" label="Accessibility information" rows={2} />
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="font-display text-2xl">Links</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="websiteUrl" label="Website" type="url" placeholder="https://" />
          <TextField name="instagramUrl" label="Instagram" type="url" placeholder="https://instagram.com/…" />
          <TextField name="facebookUrl" label="Facebook" type="url" placeholder="https://facebook.com/…" />
          <TextField name="otherSocialUrl" label="Other link" type="url" placeholder="https://" />
          <TextField name="registrationUrl" label="Sign-up or registration link" type="url" placeholder="https://" />
          <TextField name="logoUrl" label="Logo or photo link" type="url" placeholder="https://…/logo.png" hint="Use an image your organization owns. We do not upload files here." />
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="font-display text-2xl">About you</legend>
        <p className="text-sm text-stone-600">Your name and email are kept private unless you choose to publish them below.</p>
        <div className="grid gap-5 md:grid-cols-3">
          <TextField name="submitterName" label="Your name" required autoComplete="name" />
          <TextField name="submitterRole" label="Your role" required placeholder="President, staff, advisor…" />
          <TextField name="submitterEmail" label="Your email" type="email" required autoComplete="email" />
        </div>
        <label className="flex min-h-[44px] items-start gap-3 text-sm text-stone-700">
          <input type="checkbox" name="publishContact" value="true" className="mt-0.5 h-5 w-5 shrink-0 rounded border-line text-brand-700" />
          Show my name, role, and email on the public listing so students can contact me. (Optional; please do not publish a student’s personal contact details without their permission.)
        </label>
        <label id="field-consentToPublish" className="flex min-h-[44px] items-start gap-3 text-sm text-stone-800">
          <input type="checkbox" name="consentToPublish" value="true" required className="mt-0.5 h-5 w-5 shrink-0 rounded border-line text-brand-700" />
          <span>
            I lead or represent this organization, the information above is accurate, and the directory may publish it. <span aria-hidden="true">*</span>
          </span>
        </label>
      </fieldset>

      <SubmitButton pendingLabel="Submitting…">Submit for review</SubmitButton>
    </ActionForm>
  );
}
