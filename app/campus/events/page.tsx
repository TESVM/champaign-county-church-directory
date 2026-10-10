import type { Metadata } from "next";
import Link from "next/link";
import { CampusNav } from "@/components/campus/campus-nav";
import { CampusEventList } from "@/components/campus/event-list";
import { SectionHeading } from "@/components/layout/section-heading";
import { SelectField } from "@/components/ui/field";
import { CAMPUSES, EVENT_CATEGORIES } from "@/lib/campus";
import { toEventView } from "@/lib/campus-format";
import { listCampusEvents } from "@/lib/services/campus";

export const metadata: Metadata = {
  title: "Student Events: Worship Nights, Bible Studies, and Free Meals",
  description: "Christian student events in Champaign-Urbana: worship nights, Bible studies, free meals, welcome-week events, service projects, and retreats.",
  alternates: { canonical: "/campus/events" }
};

type Search = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export default async function CampusEventsPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const category = first(sp.category);
  const campus = first(sp.campus);
  const events = await listCampusEvents({ category, campus });

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeading as="h1" eyebrow="Campus Faith" title="Student events" description="Reviewed events from campus ministries and churches. Save the ones you like, or add them to your calendar." />
      <CampusNav current="/campus/events" />
      <form action="/campus/events" className="grid gap-4 rounded-[24px] border border-line bg-white p-5 shadow-card md:grid-cols-[1fr_1fr_auto] md:items-end">
        <SelectField name="category" label="Kind of event" defaultValue={category ?? ""} options={[{ value: "", label: "All events" }, ...EVENT_CATEGORIES.map(([value, label]) => ({ value, label }))]} />
        <SelectField name="campus" label="Campus" defaultValue={campus ?? ""} options={[{ value: "", label: "Any campus" }, ...CAMPUSES.map((c) => ({ value: c.key, label: c.short }))]} />
        <button type="submit" className="focus-ring min-h-[48px] rounded-full bg-brand-900 px-6 text-sm font-semibold text-white hover:bg-brand-700">
          Filter
        </button>
      </form>
      <CampusEventList events={events.map(toEventView)} />
      <p className="text-sm text-stone-600">
        Hosting something for students?{" "}
        <Link href="/campus/submit-event" className="font-semibold text-brand-900 underline">
          Submit an event
        </Link>
        . Churches can also tag their own events for this calendar from their dashboard.
      </p>
    </div>
  );
}
