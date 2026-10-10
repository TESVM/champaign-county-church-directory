import type { Metadata } from "next";
import Link from "next/link";
import { CampusNav } from "@/components/campus/campus-nav";
import { StudentChurchCard } from "@/components/campus/student-church-card";
import { SectionHeading } from "@/components/layout/section-heading";
import { SelectField } from "@/components/ui/field";
import { STUDENT_TAGS } from "@/lib/campus";
import { listStudentFriendlyChurches } from "@/lib/services/campus";

export const metadata: Metadata = {
  title: "Student-Friendly Churches in Champaign-Urbana",
  description: "Churches in Champaign-Urbana with college ministries, young adult groups, and student-friendly details, sorted by distance from campus.",
  alternates: { canonical: "/campus/churches" }
};

type Search = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export default async function StudentChurchesPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const tag = first(sp.tag);
  const campus = first(sp.campus) === "parkland" ? "parkland" : "uiuc";
  const items = await listStudentFriendlyChurches({ tag, campus });

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeading
        as="h1"
        eyebrow="Campus Faith"
        title="Student-Friendly Churches"
        description="Churches that list a college, campus, or young-adult ministry on their profile, or that have told us what they offer students. Sorted by straight-line distance from campus."
      />
      <CampusNav current="/campus/churches" />
      <form action="/campus/churches" className="grid gap-4 rounded-[24px] border border-line bg-white p-5 shadow-card md:grid-cols-[1fr_240px_auto] md:items-end">
        <SelectField name="tag" label="Offers" defaultValue={tag ?? ""} options={[{ value: "", label: "Anything student-friendly" }, ...STUDENT_TAGS.map(([value, label]) => ({ value, label }))]} />
        <SelectField
          name="campus"
          label="Distance from"
          defaultValue={campus}
          options={[
            { value: "uiuc", label: "UIUC (Illini Union)" },
            { value: "parkland", label: "Parkland College" }
          ]}
        />
        <button type="submit" className="focus-ring min-h-[48px] rounded-full bg-brand-900 px-6 text-sm font-semibold text-white hover:bg-brand-700">
          Show churches
        </button>
      </form>
      <p role="status" className="text-sm text-stone-700">
        {items.length === 1 ? "1 church" : `${items.length} churches`}
      </p>
      {items.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <StudentChurchCard key={item.church.slug} item={item} campus={campus} />
          ))}
        </div>
      ) : (
        <p className="rounded-[22px] border border-dashed border-line bg-white p-6 text-stone-700">
          No church has confirmed this detail yet. Try “Anything student-friendly”, or browse the full{" "}
          <Link href="/directory" className="underline">
            directory
          </Link>
          .
        </p>
      )}
      <div className="rounded-[24px] bg-stone-50 p-5 text-sm leading-6 text-stone-600">
        <p className="font-semibold text-stone-800">Where this information comes from</p>
        <p className="mt-1">
          Student details marked “Confirmed by the church” were entered by the church’s own team. Others come from the church’s public website and are labeled that way until the church confirms them. “Listed ministries”
          are the ministry names on each church’s profile. Distances are straight-line from the Illini Union or Parkland College, not walking routes. Churches can add student details from their dashboard.
        </p>
      </div>
    </div>
  );
}
