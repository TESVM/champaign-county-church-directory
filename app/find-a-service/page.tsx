import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, MapPin } from "lucide-react";
import { SectionHeading } from "@/components/layout/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckboxField, SelectField } from "@/components/ui/field";
import { DAYS, listChurches, listCities, listDenominations, listLanguages, parseChurchFilters } from "@/lib/services/churches";
import { featureVisible } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Find a Service",
  description: "Find a church service in Champaign County by day, time, city, denomination, language, accessibility, children’s programs, and livestream.",
  alternates: { canonical: "/find-a-service" }
};

const WINDOWS = { morning: [0, 720], afternoon: [720, 1020], evening: [1020, 1440] } as const;

export default async function FindAServicePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])) as Record<string, string | undefined>;
  const filters = parseChurchFilters(raw);
  const searched = Object.values(raw).some(Boolean);
  const day = filters.serviceDay ?? (searched ? undefined : "Sunday");
  const effective = { ...filters, serviceDay: day };

  const [results, cities, denominations, languages] = await Promise.all([
    listChurches(effective, 1, 500),
    listCities(),
    listDenominations(),
    listLanguages()
  ]);

  const services = results.items
    .flatMap((church) =>
      (church.serviceDetails ?? [])
        .filter((s) => !day || s.dayOfWeek.toLowerCase() === day.toLowerCase())
        .filter((s) => {
          if (!filters.timeOfDay) return true;
          if (s.startMinutes === undefined) return false;
          const [from, to] = WINDOWS[filters.timeOfDay];
          return s.startMinutes >= from && s.startMinutes < to;
        })
        .filter((s) => !filters.language || s.language === filters.language || church.visitorGuide?.languages.includes(filters.language))
        .map((service) => ({ church, service }))
    )
    .sort(
      (a, b) =>
        DAYS.indexOf(a.service.dayOfWeek as (typeof DAYS)[number]) - DAYS.indexOf(b.service.dayOfWeek as (typeof DAYS)[number]) ||
        (a.service.startMinutes ?? 9999) - (b.service.startMinutes ?? 9999) ||
        a.church.name.localeCompare(b.church.name)
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        as="h1"
        eyebrow="Find a service"
        title={day ? `${day} services in Champaign County` : "Church services in Champaign County"}
        description="Choose a day and time that work for you. Times come from church websites or the churches themselves; confirm with the church before a first visit."
      />

      <form action="/find-a-service" className="mt-8 grid gap-4 rounded-[28px] border border-line bg-white p-5 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <SelectField name="serviceDay" label="Day" defaultValue={day ?? ""} options={[{ value: "", label: "Any day" }, ...DAYS.map((d) => ({ value: d, label: d }))]} />
        <SelectField
          name="timeOfDay"
          label="Time"
          defaultValue={raw.timeOfDay ?? ""}
          options={[
            { value: "", label: "Any time" },
            { value: "morning", label: "Morning" },
            { value: "afternoon", label: "Afternoon" },
            { value: "evening", label: "Evening" }
          ]}
        />
        <SelectField name="city" label="City" defaultValue={raw.city ?? ""} options={[{ value: "", label: "Any city" }, ...cities.map((c) => ({ value: c.slug, label: c.name }))]} />
        <SelectField name="denomination" label="Denomination" defaultValue={raw.denomination ?? ""} options={[{ value: "", label: "Any" }, ...denominations.map((d) => ({ value: d, label: d }))]} />
        {languages.length ? (
          <SelectField name="language" label="Language" defaultValue={raw.language ?? ""} options={[{ value: "", label: "Any language" }, ...languages.map((l) => ({ value: l, label: l }))]} />
        ) : null}
        <fieldset className="sm:col-span-2 lg:col-span-3">
          <legend className="text-sm font-medium text-stone-700">Must have</legend>
          <div className="grid gap-x-4 sm:grid-cols-3">
            <CheckboxField name="wheelchair" label="Wheelchair access" value="true" defaultChecked={raw.wheelchair === "true"} />
            <CheckboxField name="children" label="Children’s program" value="true" defaultChecked={raw.children === "true"} />
            <CheckboxField name="hasLivestream" label="Livestream" value="true" defaultChecked={raw.hasLivestream === "true"} />
          </div>
        </fieldset>
        <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="min-h-[44px] rounded-full bg-brand-900 px-6 font-semibold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
            Find services
          </button>
          <Link href="/find-a-service" className="inline-flex min-h-[44px] items-center px-3 text-sm font-semibold text-brand-900 hover:underline focus-ring">
            Reset
          </Link>
        </div>
      </form>

      <p className="mt-6 text-sm font-medium text-stone-700" role="status">
        {services.length} service{services.length === 1 ? "" : "s"} at {new Set(services.map((s) => s.church.id)).size} church
        {new Set(services.map((s) => s.church.id)).size === 1 ? "" : "es"}
      </p>

      {services.length ? (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {services.map(({ church, service }) => (
            <li key={service.id} className="rounded-[20px] border border-line bg-white p-4 shadow-card">
              <p className="flex items-center gap-2 text-sm font-semibold text-brand-900">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                {service.dayOfWeek} · {service.startTime}
                {service.endTime ? `–${service.endTime}` : ""}
                {service.language ? ` · ${service.language}` : ""}
              </p>
              <p className="mt-1 font-display text-xl">
                <Link href={`/churches/${church.slug}`} className="hover:underline focus-ring">
                  {church.name}
                </Link>
              </p>
              <p className="text-sm text-stone-600">
                {service.serviceName}
                {service.notes ? ` — ${service.notes}` : ""}
              </p>
              <p className="mt-2 flex items-start gap-2 text-sm text-stone-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                {church.address1 ? `${church.address1}, ` : ""}
                {church.city}
              </p>
              <p className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-brand-900">
                {church.denomination ? <span className="rounded-full bg-brand-50 px-2 py-1">{church.denomination}</span> : null}
                {church.visitorGuide?.wheelchairAccessible ? <span className="rounded-full bg-brand-50 px-2 py-1">Wheelchair accessible</span> : null}
                {church.visitorGuide?.hasChildrenProgram ? <span className="rounded-full bg-brand-50 px-2 py-1">Children’s program</span> : null}
                {featureVisible("livestream", church.enhancedProfile) && church.livestreamUrl ? <span className="rounded-full bg-brand-50 px-2 py-1">Livestream</span> : null}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4">
          <EmptyState
            title="No services matched"
            body={
              filters.wheelchair || filters.children || filters.language
                ? "Accessibility, children’s, and language details are added by churches themselves, and many have not added them yet. Remove those filters to see more, or call a church to ask."
                : "Try another day or time, or widen the city. Some churches have not listed service times yet; you can find them in the full directory."
            }
          />
        </div>
      )}
    </div>
  );
}
