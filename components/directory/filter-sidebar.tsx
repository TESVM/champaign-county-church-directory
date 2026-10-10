import Link from "next/link";
import { CheckboxField, SelectField, TextField } from "@/components/ui/field";
import { DAYS } from "@/lib/services/churches";

export type FilterOptions = {
  cities: Array<{ slug: string; name: string; churchCount: number }>;
  denominations: string[];
  languages: string[];
};

export function FilterSidebar({
  searchParams,
  options,
  action = "/directory"
}: {
  searchParams: Record<string, string | undefined>;
  options: FilterOptions;
  action?: string;
}) {
  return (
    <aside aria-labelledby="filter-heading" className="rounded-[28px] border border-line bg-white p-6 shadow-card">
      <h2 id="filter-heading" className="font-display text-2xl">
        Filter churches
      </h2>

      <form action={action} className="mt-5 space-y-4">
        <TextField name="q" label="Search" defaultValue={searchParams.q} placeholder="Name, pastor, ministry…" />
        <SelectField
          name="city"
          label="City"
          defaultValue={searchParams.city ?? ""}
          options={[{ value: "", label: "Any city" }, ...options.cities.map((c) => ({ value: c.slug, label: `${c.name} (${c.churchCount})` }))]}
        />
        <SelectField
          name="denomination"
          label="Denomination"
          defaultValue={searchParams.denomination ?? ""}
          options={[{ value: "", label: "Any denomination" }, ...options.denominations.map((d) => ({ value: d, label: d }))]}
        />
        <SelectField
          name="serviceDay"
          label="Service day"
          defaultValue={searchParams.serviceDay ?? ""}
          options={[{ value: "", label: "Any day" }, ...DAYS.map((d) => ({ value: d, label: d }))]}
        />
        <SelectField
          name="timeOfDay"
          label="Service time"
          defaultValue={searchParams.timeOfDay ?? ""}
          options={[
            { value: "", label: "Any time" },
            { value: "morning", label: "Morning (before noon)" },
            { value: "afternoon", label: "Afternoon (noon–5 PM)" },
            { value: "evening", label: "Evening (5 PM or later)" }
          ]}
        />
        {options.languages.length ? (
          <SelectField
            name="language"
            label="Language"
            defaultValue={searchParams.language ?? ""}
            options={[{ value: "", label: "Any language" }, ...options.languages.map((l) => ({ value: l, label: l }))]}
          />
        ) : null}
        <TextField name="ministry" label="Ministry" defaultValue={searchParams.ministry} placeholder="Youth, choir, recovery…" />

        <fieldset className="space-y-1 pt-2">
          <legend className="text-sm font-medium text-stone-700">Show only churches that have</legend>
          <CheckboxField name="wheelchair" label="Wheelchair access (church-reported)" value="true" defaultChecked={searchParams.wheelchair === "true"} />
          <CheckboxField name="children" label="Children’s program (church-reported)" value="true" defaultChecked={searchParams.children === "true"} />
          <CheckboxField name="hasLivestream" label="A livestream" value="true" defaultChecked={searchParams.hasLivestream === "true"} />
          <CheckboxField name="hasWebsite" label="A website" value="true" defaultChecked={searchParams.hasWebsite === "true"} />
          <CheckboxField name="verified" label="Checked or confirmed details" value="true" defaultChecked={searchParams.verified === "true"} />
          <CheckboxField name="claimed" label="Church-managed listing" value="true" defaultChecked={searchParams.claimed === "true"} />
          <CheckboxField name="studentFriendly" label="Student-friendly details" value="true" defaultChecked={searchParams.studentFriendly === "true"} />
        </fieldset>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="min-h-[44px] flex-1 rounded-full bg-brand-900 px-5 py-3 font-semibold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Apply filters
          </button>
          <Link href={action} className="inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold text-brand-900 hover:underline focus-ring">
            Clear
          </Link>
        </div>
      </form>
    </aside>
  );
}
