"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { saveProfileAction } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";

type Service = { serviceName: string; dayOfWeek: string; startTime: string; endTime?: string; language?: string; notes?: string };
type Leader = { fullName: string; title?: string };

export type ProfileFormValues = {
  churchId: string;
  name: string;
  denomination?: string;
  description?: string;
  address1?: string;
  address2?: string;
  citySlug: string;
  zip?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  appUrl?: string;
  appStoreUrl?: string;
  googlePlayUrl?: string;
  livestreamUrl?: string;
  social: Record<string, string>;
  pastorName?: string;
  pastorTitle?: string;
  ministries: string[];
  leaders: Leader[];
  services: Service[];
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const LABELS: Record<string, string> = {
  name: "Church name",
  citySlug: "City",
  zip: "ZIP code",
  phone: "Phone",
  email: "Public email",
  websiteUrl: "Website",
  appStoreUrl: "Apple App Store link",
  googlePlayUrl: "Google Play link",
  livestreamUrl: "Livestream link",
  facebookUrl: "Facebook",
  instagramUrl: "Instagram",
  youtubeUrl: "YouTube",
  xUrl: "X (Twitter)",
  tiktokUrl: "TikTok",
  services: "Service times",
  leaders: "Leadership"
};

const sectionClass = "space-y-4 rounded-[24px] border border-line bg-white p-5 sm:p-6";

export function ProfileForm({ values, cities, enhanced }: { values: ProfileFormValues; cities: Array<{ slug: string; name: string }>; enhanced: boolean }) {
  const [services, setServices] = useState<Service[]>(values.services.length ? values.services : []);
  const [leaders, setLeaders] = useState<Leader[]>(values.leaders);
  const [ministries, setMinistries] = useState(values.ministries.join("\n"));

  const updateService = (index: number, patch: Partial<Service>) => setServices((list) => list.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  const updateLeader = (index: number, patch: Partial<Leader>) => setLeaders((list) => list.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  const paidNote = enhanced ? null : <p className="text-sm text-stone-600">Saved now; shown publicly with the Enhanced Church Profile.</p>;

  return (
    <ActionForm action={saveProfileAction} fieldLabels={LABELS}>
      <input type="hidden" name="churchId" value={values.churchId} />
      <input type="hidden" name="services" value={JSON.stringify(services)} />
      <input type="hidden" name="leaders" value={JSON.stringify(leaders.filter((l) => l.fullName.trim()))} />
      {ministries
        .split("\n")
        .map((m) => m.trim())
        .filter(Boolean)
        .map((m, i) => (
          <input key={`${m}-${i}`} type="hidden" name="ministries" value={m} />
        ))}

      <section id="about" className={sectionClass} aria-labelledby="sec-about">
        <h2 id="sec-about" className="font-display text-2xl">About</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="name" label="Church name" required defaultValue={values.name} />
          <TextField name="denomination" label="Denomination" defaultValue={values.denomination} />
        </div>
        <TextAreaField name="description" label="Description" defaultValue={values.description} hint="Who you are and what a visitor can expect. Plain language works best." rows={6} />
      </section>

      <section id="location" className={sectionClass} aria-labelledby="sec-location">
        <h2 id="sec-location" className="font-display text-2xl">Location</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="address1" label="Street address" defaultValue={values.address1} autoComplete="street-address" />
          <TextField name="address2" label="Address line 2" defaultValue={values.address2} />
          <SelectField name="citySlug" label="City" required defaultValue={values.citySlug} options={cities.map((c) => ({ value: c.slug, label: c.name }))} />
          <TextField name="zip" label="ZIP code" defaultValue={values.zip} inputMode="numeric" />
        </div>
      </section>

      <section id="contact" className={sectionClass} aria-labelledby="sec-contact">
        <h2 id="sec-contact" className="font-display text-2xl">Contact and links</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="phone" label="Public phone" type="tel" defaultValue={values.phone} />
          <TextField name="email" label="Public email" type="email" defaultValue={values.email} />
          <TextField name="websiteUrl" label="Website" type="url" defaultValue={values.websiteUrl} placeholder="https://" />
        </div>
        <h3 className="pt-2 font-semibold text-ink">Livestream, app, and social media</h3>
        {paidNote}
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="livestreamUrl" label="Livestream link" type="url" defaultValue={values.livestreamUrl} hint="YouTube, Facebook Live, or your own watch page." />
          <TextField name="appStoreUrl" label="Apple App Store link" type="url" defaultValue={values.appStoreUrl} hint="Must be an apps.apple.com link." />
          <TextField name="googlePlayUrl" label="Google Play link" type="url" defaultValue={values.googlePlayUrl} hint="Must be a play.google.com link." />
          <TextField name="appUrl" label="Other app link" type="url" defaultValue={values.appUrl} hint="Only if your app is not in either store." />
          <TextField name="facebookUrl" label="Facebook" type="url" defaultValue={values.social.facebook} />
          <TextField name="instagramUrl" label="Instagram" type="url" defaultValue={values.social.instagram} />
          <TextField name="youtubeUrl" label="YouTube" type="url" defaultValue={values.social.youtube} />
          <TextField name="xUrl" label="X (Twitter)" type="url" defaultValue={values.social.x} />
          <TextField name="tiktokUrl" label="TikTok" type="url" defaultValue={values.social.tiktok} />
        </div>
      </section>

      <section id="services" className={sectionClass} aria-labelledby="sec-services">
        <h2 id="sec-services" className="font-display text-2xl">Service times</h2>
        <p className="text-sm text-stone-600">Times are Central Time. Use the format 10:30 AM.</p>
        <div className="space-y-4">
          {services.map((service, index) => (
            <fieldset key={index} className="grid gap-3 rounded-2xl bg-brand-50/60 p-4 md:grid-cols-6">
              <legend className="sr-only">Service {index + 1}</legend>
              <label className="text-sm md:col-span-2">
                <span className="font-medium text-stone-700">Name</span>
                <input className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3" value={service.serviceName} onChange={(e) => updateService(index, { serviceName: e.target.value })} placeholder="Sunday Worship" />
              </label>
              <label className="text-sm">
                <span className="font-medium text-stone-700">Day</span>
                <select className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3" value={service.dayOfWeek} onChange={(e) => updateService(index, { dayOfWeek: e.target.value })}>
                  {DAYS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="font-medium text-stone-700">Starts</span>
                <input className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3" value={service.startTime} onChange={(e) => updateService(index, { startTime: e.target.value })} placeholder="10:30 AM" />
              </label>
              <label className="text-sm">
                <span className="font-medium text-stone-700">Ends (optional)</span>
                <input className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3" value={service.endTime ?? ""} onChange={(e) => updateService(index, { endTime: e.target.value })} placeholder="12:00 PM" />
              </label>
              <label className="text-sm">
                <span className="font-medium text-stone-700">Language</span>
                <input className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3" value={service.language ?? ""} onChange={(e) => updateService(index, { language: e.target.value })} placeholder="English" />
              </label>
              <label className="text-sm md:col-span-5">
                <span className="font-medium text-stone-700">Notes</span>
                <input className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3" value={service.notes ?? ""} onChange={(e) => updateService(index, { notes: e.target.value })} placeholder="Nursery available, livestreamed…" />
              </label>
              <div className="flex items-end">
                <button type="button" onClick={() => setServices((list) => list.filter((_, i) => i !== index))} className="inline-flex min-h-[44px] items-center gap-1 rounded-full px-3 text-sm font-semibold text-rose-800 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove<span className="sr-only"> service {index + 1}</span>
                </button>
              </div>
            </fieldset>
          ))}
        </div>
        <button type="button" onClick={() => setServices((list) => [...list, { serviceName: "Worship Service", dayOfWeek: "Sunday", startTime: "" }])} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold hover:border-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add a service
        </button>
      </section>

      <section id="leadership" className={sectionClass} aria-labelledby="sec-leadership">
        <h2 id="sec-leadership" className="font-display text-2xl">Leadership</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="pastorName" label="Lead pastor" defaultValue={values.pastorName} />
          <TextField name="pastorTitle" label="Title" defaultValue={values.pastorTitle} placeholder="Senior Pastor" />
        </div>
        <h3 className="pt-2 font-semibold text-ink">Other leaders and staff</h3>
        {paidNote}
        {leaders.map((leader, index) => (
          <div key={index} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="text-sm"><span className="font-medium text-stone-700">Name</span>
              <input className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3" value={leader.fullName} onChange={(e) => updateLeader(index, { fullName: e.target.value })} />
            </label>
            <label className="text-sm"><span className="font-medium text-stone-700">Role</span>
              <input className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3" value={leader.title ?? ""} onChange={(e) => updateLeader(index, { title: e.target.value })} />
            </label>
            <div className="flex items-end">
              <button type="button" onClick={() => setLeaders((list) => list.filter((_, i) => i !== index))} className="inline-flex min-h-[44px] items-center gap-1 rounded-full px-3 text-sm font-semibold text-rose-800 hover:bg-rose-50">
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove<span className="sr-only"> {leader.fullName}</span>
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setLeaders((list) => [...list, { fullName: "", title: "" }])} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold hover:border-brand-700">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add a leader
        </button>
        <h3 className="pt-2 font-semibold text-ink">Ministries</h3>
        {paidNote}
        <label className="block text-sm">
          <span className="font-medium text-stone-700">One ministry per line</span>
          <textarea className="mt-1 min-h-[120px] w-full rounded-2xl border border-line bg-white p-3" value={ministries} onChange={(e) => setMinistries(e.target.value)} />
        </label>
      </section>

      <div className="sticky bottom-0 z-10 -mx-1 flex items-center gap-4 rounded-2xl bg-white/95 p-3 shadow-soft backdrop-blur">
        <SubmitButton pendingLabel="Saving…">Save listing</SubmitButton>
        <p className="text-sm text-stone-600">Saving publishes your changes immediately.</p>
      </div>
    </ActionForm>
  );
}
