import Link from "next/link";
import { cancelEventAction, saveEventAction } from "@/app/actions";
import { CheckboxGroup } from "@/components/campus/checkbox-group";
import { ChurchTabs } from "@/components/dashboard/church-tabs";
import { PhotoFileInput } from "@/components/dashboard/photo-file-input";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { isStaff } from "@/lib/actor";
import { loadManagedChurch } from "@/lib/dashboard";
import { EVENT_CATEGORIES, eventCategoryLabel } from "@/lib/campus";
import { featureVisible } from "@/lib/plans";
import { listChurchEventsForEditing } from "@/lib/services/engagement";
import { displayTime } from "@/lib/time/chicago";

export default async function EventsDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { church, actor, canManage } = await loadManagedChurch(slug, "/events");
  const allowed = featureVisible("events", church.enhancedProfile) || isStaff(actor);
  const events = await listChurchEventsForEditing(actor, church.id);
  return (
    <>
      <ChurchTabs slug={slug} current="/events" canManage={canManage} />
      {!allowed ? (
        <Card className="mt-6 p-6">
          <h2 className="font-display text-2xl">Events are part of the Enhanced Church Profile</h2>
          <p className="mt-2 text-sm text-stone-700">Enhanced churches can post events to their listing and the county calendar, with calendar downloads for visitors.</p>
          {canManage ? <Link href={`/dashboard/churches/${slug}/billing`} className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-brand-900 px-5 text-sm font-semibold text-white">See billing</Link> : <p className="mt-3 text-sm text-stone-600">Ask your listing’s owner about upgrading.</p>}
        </Card>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-6">
            <h2 className="font-display text-2xl">Add an event</h2>
            <p className="mt-1 text-sm text-stone-600">Times are Central Time; weekly events keep the same local time across daylight-saving changes.</p>
            <div className="mt-4">
              <ActionForm action={saveEventAction} resetOnSuccess fieldLabels={{ startDate: "Date", startTime: "Start time", endTime: "End time", recurrenceUntil: "Repeat until", registrationUrl: "Registration link", flyerFile: "Flyer image", flyerUrl: "Flyer link" }}>
                <input type="hidden" name="churchId" value={church.id} />
                <TextField name="title" label="Title" required />
                <div className="grid gap-4 sm:grid-cols-3">
                  <TextField name="startDate" label="Date" type="date" required />
                  <TextField name="startTime" label="Start time" type="time" hint="Leave blank for all day." />
                  <TextField name="endTime" label="End time" type="time" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField name="recurrence" label="Repeats" defaultValue="NONE" options={[{ value: "NONE", label: "Does not repeat" }, { value: "WEEKLY", label: "Every week" }]} />
                  <TextField name="recurrenceUntil" label="Repeat until (weekly only)" type="date" />
                </div>
                <TextField name="location" label="Location" hint="Leave blank to use the church address." />
                <TextAreaField name="description" label="Description" />
                <TextField name="registrationUrl" label="Registration link" type="url" />
                <fieldset className="space-y-3 rounded-2xl border border-line p-4">
                  <legend className="px-1 text-sm font-medium text-stone-800">Flyer (optional)</legend>
                  <PhotoFileInput name="flyerFile" label="Upload a flyer image (JPEG, PNG, or WebP, up to 4 MB)" />
                  <TextField name="flyerUrl" label="…or paste a link to the flyer image (https)" type="url" />
                  <p className="text-xs text-stone-500">Put the date, time, and place in the fields above too: people search those, and screen readers cannot read text inside an image.</p>
                </fieldset>
                <CheckboxGroup name="categories" legend="Also show on the Campus Faith student calendar as" options={EVENT_CATEGORIES} hint="Optional. Tick any that fit and the event also appears on the student events calendar." />
                <SubmitButton>Publish event</SubmitButton>
              </ActionForm>
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="font-display text-2xl">Your events</h2>
            {events.length ? (
              <ul className="mt-4 space-y-3">
                {events.map((e) => (
                  <li key={e.id} className="rounded-2xl border border-line p-4">
                    <p className="font-semibold">{e.title}</p>
                    <p className="text-sm text-stone-600">
                      {e.startDate}
                      {e.startTime ? ` · ${displayTime(e.startTime)}` : " · all day"}
                      {e.recurrence === "WEEKLY" ? ` · weekly until ${e.recurrenceUntil}` : ""} · {e.status === "CANCELLED" ? "Cancelled" : "Published"}
                    </p>
                    {e.flyerUrl ? (
                      <a href={e.flyerUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand-900 underline">
                        Flyer attached
                      </a>
                    ) : null}
                    {e.categories.length ? <p className="text-xs text-brand-900">Student calendar: {e.categories.map(eventCategoryLabel).join(", ")}</p> : null}
                    {e.status === "PUBLISHED" ? (
                      <div className="mt-2">
                        <ActionForm action={cancelEventAction}>
                          <input type="hidden" name="eventId" value={e.id} />
                          <SubmitButton variant="secondary" pendingLabel="Cancelling…">Cancel event</SubmitButton>
                        </ActionForm>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-stone-600">No events yet.</p>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
