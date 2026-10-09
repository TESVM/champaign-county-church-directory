import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/layout/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectField, TextField } from "@/components/ui/field";
import { listCities } from "@/lib/services/churches";
import { RESOURCE_CATEGORIES, listResources } from "@/lib/services/engagement";

export const metadata: Metadata = {
  title: "Community Help from Local Churches",
  description: "Food pantries, community meals, clothing, support groups, and other help offered by churches in Champaign County.",
  alternates: { canonical: "/resources" }
};

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; city?: string }> }) {
  const params = await searchParams;
  const [resources, cities] = await Promise.all([
    listResources({ q: params.q?.slice(0, 100), category: params.category, citySlug: params.city || undefined }),
    listCities()
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        as="h1"
        eyebrow="Community help"
        title="Help offered by local churches"
        description="Programs are listed by the churches that run them and reviewed before publishing. Schedules change, so call ahead when you can."
      />
      <form action="/resources" className="mt-8 grid gap-4 rounded-[24px] border border-line bg-white p-4 shadow-card sm:grid-cols-3">
        <TextField name="q" label="Search" defaultValue={params.q} placeholder="Food, meals, recovery…" />
        <SelectField name="category" label="Type of help" defaultValue={params.category ?? ""} options={[{ value: "", label: "Any" }, ...RESOURCE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))]} />
        <SelectField name="city" label="City" defaultValue={params.city ?? ""} options={[{ value: "", label: "Any city" }, ...cities.map((c) => ({ value: c.slug, label: c.name }))]} />
        <div className="sm:col-span-3">
          <button type="submit" className="min-h-[44px] rounded-full bg-brand-900 px-6 font-semibold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
            Search
          </button>
        </div>
      </form>

      {resources.length ? (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {resources.map((r) => (
            <li key={r.id} className="rounded-[20px] border border-line bg-white p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">{RESOURCE_CATEGORIES.find((c) => c.value === r.category)?.label}</p>
              <h2 className="mt-1 font-display text-xl">{r.title}</h2>
              <p className="text-sm text-stone-700">
                <Link href={`/churches/${r.church.slug}`} className="font-semibold underline-offset-4 hover:underline">
                  {r.church.name}
                </Link>
                {r.church.address1 ? ` · ${r.church.address1}, ${r.church.city}` : ` · ${r.church.city}`}
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-700">{r.description}</p>
              {r.schedule ? <p className="mt-2 text-sm"><span className="font-semibold">When:</span> {r.schedule}</p> : null}
              {r.eligibility ? <p className="text-sm"><span className="font-semibold">Who can use it:</span> {r.eligibility}</p> : null}
              {r.contact ? <p className="text-sm"><span className="font-semibold">Contact:</span> {r.contact}</p> : r.church.phone ? <p className="text-sm"><span className="font-semibold">Church phone:</span> {r.church.phone}</p> : null}
              {r.url ? (
                <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-flex text-sm font-semibold text-brand-900 underline-offset-4 hover:underline">
                  More information
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8">
          <EmptyState
            title={params.q || params.category || params.city ? "Nothing matched that search" : "No programs listed yet"}
            body="Churches can add food pantries, meals, and other programs from their dashboard. For urgent needs in Champaign County, call 211."
          />
        </div>
      )}
    </div>
  );
}
