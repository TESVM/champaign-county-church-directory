import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CampusNav, ListOrgCallout } from "@/components/campus/campus-nav";
import { CampusEventList } from "@/components/campus/event-list";
import { OrgCard } from "@/components/campus/org-card";
import { StudentChurchCard } from "@/components/campus/student-church-card";
import { SectionHeading } from "@/components/layout/section-heading";
import { campusBySlug } from "@/lib/campus";
import { toEventView } from "@/lib/campus-format";
import { listCampusEvents, listOrganizations, listStudentFriendlyChurches } from "@/lib/services/campus";

type Props = { params: Promise<{ campus: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const campus = campusBySlug((await params).campus);
  if (!campus) return {};
  return {
    title: `Campus Faith at ${campus.short}: Ministries, Churches, and Events`,
    description: `Christian campus ministries, student-friendly churches, and student events for ${campus.label} in Champaign-Urbana.`,
    alternates: { canonical: `/campus/${campus.slug}` }
  };
}

export default async function CampusDetailPage({ params }: Props) {
  const campus = campusBySlug((await params).campus);
  if (!campus) notFound();
  const [orgs, churches, events] = await Promise.all([
    listOrganizations({ campus: campus.key }),
    listStudentFriendlyChurches({ campus: campus.key }),
    listCampusEvents({ campus: campus.key, days: 90 })
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeading
        as="h1"
        eyebrow={`Campus Faith · ${campus.short}`}
        title={campus.label}
        description={
          campus.key === "other"
            ? "For community college, graduate, online, visiting, and international students, and anyone between schools. All students welcome."
            : `Campus ministries, churches that welcome students, and events for ${campus.short} students. All students welcome.`
        }
      />
      <CampusNav current="" />

      <section className="space-y-5">
        <h2 className="font-display text-3xl text-ink">Campus ministries</h2>
        {orgs.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => (
              <OrgCard key={org.slug} org={org} />
            ))}
          </div>
        ) : (
          <p className="rounded-[22px] border border-dashed border-line bg-white p-6 text-stone-700">No ministries have listed {campus.short} yet. Every listing is reviewed before it appears.</p>
        )}
        <ListOrgCallout />
      </section>

      <section className="space-y-5">
        <h2 className="font-display text-3xl text-ink">Churches that welcome students</h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {churches.slice(0, 9).map((item) => (
            <StudentChurchCard key={item.church.slug} item={item} campus={campus.key === "parkland" ? "parkland" : "uiuc"} />
          ))}
        </div>
        <Link href="/campus/churches" className="inline-block text-sm font-semibold text-brand-900 underline-offset-4 hover:underline">
          See all student-friendly churches
        </Link>
      </section>

      <section className="space-y-5">
        <h2 className="font-display text-3xl text-ink">Upcoming student events</h2>
        {events.length ? (
          <CampusEventList events={events.slice(0, 10).map(toEventView)} />
        ) : (
          <p className="rounded-[22px] border border-dashed border-line bg-white p-6 text-stone-700">
            No events listed for {campus.short} yet.{" "}
            <Link href="/campus/submit-event" className="font-semibold text-brand-900 underline">
              Submit one
            </Link>
            .
          </p>
        )}
      </section>
    </div>
  );
}
