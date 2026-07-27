import { CheckboxField, TextField } from "@/components/ui/field";

export function FilterSidebar({
  searchParams
}: {
  searchParams: Record<string, string | undefined>;
}) {
  return (
    <aside
      aria-labelledby="filter-heading"
      className="overflow-hidden rounded-[28px] border border-white/70 bg-gradient-to-b from-brand-900 via-brand-700 to-brand-500 p-[1px] shadow-soft"
    >
      <div className="rounded-[27px] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(238,248,248,0.92))] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">
          Refine results
        </p>
        <h2 id="filter-heading" className="mt-3 font-display text-2xl">
          Filter churches
        </h2>

        <form action="/directory" className="mt-6 space-y-4">
          <TextField name="q" label="Search" defaultValue={searchParams.q} placeholder="Church name, city, or pastor" />
          <TextField name="city" label="City" defaultValue={searchParams.city} hint="Use the city name, for example: champaign" />
          <TextField name="denomination" label="Denomination" defaultValue={searchParams.denomination} />
          <TextField name="pastor" label="Senior pastor" defaultValue={searchParams.pastor} />
          <TextField name="serviceDay" label="Service day" defaultValue={searchParams.serviceDay} placeholder="Sunday" />
          <TextField name="ministry" label="Ministry" defaultValue={searchParams.ministry} />

          <fieldset className="space-y-1 pt-2">
            <legend className="text-sm font-medium text-stone-700">
              Show only churches that have
            </legend>
            <CheckboxField name="hasWebsite" label="A website" value="true" defaultChecked={searchParams.hasWebsite === "true"} />
            <CheckboxField name="hasApp" label="A church app" value="true" defaultChecked={searchParams.hasApp === "true"} />
            <CheckboxField name="hasLivestream" label="A livestream" value="true" defaultChecked={searchParams.hasLivestream === "true"} />
            <CheckboxField name="verified" label="Been verified" value="true" defaultChecked={searchParams.verified === "true"} />
            <CheckboxField name="claimed" label="Been claimed by staff" value="true" defaultChecked={searchParams.claimed === "true"} />
          </fieldset>

          <button
            type="submit"
            className="min-h-[44px] w-full rounded-full bg-gradient-to-r from-brand-700 to-rose px-5 py-3 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 focus-visible:ring-offset-2"
          >
            Apply filters
          </button>
        </form>
      </div>
    </aside>
  );
}
