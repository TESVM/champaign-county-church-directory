import type { Metadata } from "next";
import { CampusNav, ListOrgCallout } from "@/components/campus/campus-nav";
import { OrgCard } from "@/components/campus/org-card";
import { SectionHeading } from "@/components/layout/section-heading";
import { SelectField, TextField } from "@/components/ui/field";
import { CAMPUSES, MEETING_TYPES } from "@/lib/campus";
import { listOrganizations } from "@/lib/services/campus";

export const metadata: Metadata = {
  title: "Campus Ministries in Champaign-Urbana",
  description: "Christian student organizations and campus ministries at the University of Illinois, Parkland College, and beyond. Every listing is reviewed.",
  alternates: { canonical: "/campus/organizations" }
};

type Search = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export default async function OrganizationsPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const filters = { campus: first(sp.campus), type: first(sp.type), q: first(sp.q)?.slice(0, 80) };
  const orgs = await listOrganizations(filters);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeading as="h1" eyebrow="Campus Faith" title="Campus ministries" description="Student organizations and ministries listed by their leaders and reviewed by the directory. Meeting details come from each organization." />
      <CampusNav current="/campus/organizations" />
      <form action="/campus/organizations" className="grid gap-4 rounded-[24px] border border-line bg-white p-5 shadow-card md:grid-cols-[1fr_220px_220px_auto] md:items-end">
        <TextField name="q" label="Search" defaultValue={filters.q} placeholder="Name, affiliation…" />
        <SelectField name="campus" label="Campus" defaultValue={filters.campus ?? ""} options={[{ value: "", label: "Any campus" }, ...CAMPUSES.map((c) => ({ value: c.key, label: c.short }))]} />
        <SelectField name="type" label="Gathering" defaultValue={filters.type ?? ""} options={[{ value: "", label: "Any kind" }, ...MEETING_TYPES.map(([value, label]) => ({ value, label }))]} />
        <button type="submit" className="focus-ring min-h-[48px] rounded-full bg-brand-900 px-6 text-sm font-semibold text-white hover:bg-brand-700">
          Search
        </button>
      </form>
      <p role="status" className="text-sm text-stone-700">
        {orgs.length === 1 ? "1 organization" : `${orgs.length} organizations`}
      </p>
      {orgs.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <OrgCard key={org.slug} org={org} />
          ))}
        </div>
      ) : (
        <p className="rounded-[22px] border border-dashed border-line bg-white p-6 text-stone-700">No organizations match yet. Campus ministries are added as their leaders list them.</p>
      )}
      <ListOrgCallout />
    </div>
  );
}
