import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { CampusNav, ListOrgCallout } from "@/components/campus/campus-nav";
import { CampusEventList } from "@/components/campus/event-list";
import { OrgCard } from "@/components/campus/org-card";
import { StudentChurchCard } from "@/components/campus/student-church-card";
import { SectionHeading } from "@/components/layout/section-heading";
import { CAMPUSES } from "@/lib/campus";
import { toEventView } from "@/lib/campus-format";
import { listCampusEvents, listFeaturedChurches, listOrganizations, listStudentFriendlyChurches } from "@/lib/services/campus";
import { siteUrl } from "@/lib/site";
import { nextService } from "@/lib/time/next-service";

export const metadata: Metadata = {
  title: "Campus Faith: Christian Community for Students in Champaign-Urbana",
  description: "Discover campus ministries, student-friendly churches, worship nights, Bible studies, service opportunities, and Christian community across Champaign-Urbana for UIUC, Parkland, and other students.",
  alternates: { canonical: "/campus" }
};

const campusBlurb: Record<string, string> = {
  uiuc: "Ministries and churches for Illini, from the Quad to Campustown.",
  parkland: "Christian community for Parkland College students in west Champaign and beyond.",
  other: "Community college, graduate, online, visiting, and international students. All students welcome."
};

export default async function CampusPage() {
  const [orgs, churches, events, featured] = await Promise.all([listOrganizations(), listStudentFriendlyChurches(), listCampusEvents({ days: 60 }), listFeaturedChurches(1)]);
  const spotlight = featured[0];
  const spotlightNext = spotlight ? nextService(spotlight.serviceDetails ?? []) : null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Campus Faith",
    url: `${siteUrl()}/campus`,
    about: "Campus ministries and student-friendly churches in Champaign-Urbana, Illinois"
  };

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="section-strong overflow-hidden rounded-[36px] border border-white/70 px-6 py-10 shadow-soft sm:px-10 sm:py-14">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">Campus Faith</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-ink sm:text-6xl">Find your people. Keep your faith.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-700">
          Discover campus ministries, student-friendly churches, worship nights, Bible studies, service opportunities, and Christian community across Champaign-Urbana.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/campus/organizations" className="focus-ring inline-flex min-h-[48px] items-center rounded-full bg-brand-900 px-6 text-sm font-semibold text-white hover:bg-brand-700">
            Explore Campus Ministries
          </Link>
          <Link href="/campus/churches" className="focus-ring inline-flex min-h-[48px] items-center rounded-full bg-white px-6 text-sm font-semibold text-ink ring-1 ring-line hover:bg-brand-50">
            Find a Student-Friendly Church
          </Link>
          <Link href="/campus/events" className="focus-ring inline-flex min-h-[48px] items-center rounded-full bg-white px-6 text-sm font-semibold text-ink ring-1 ring-line hover:bg-brand-50">
            See Upcoming Events
          </Link>
          <Link href="/campus/list-your-organization" className="focus-ring inline-flex min-h-[48px] items-center rounded-full px-6 text-sm font-semibold text-brand-900 underline-offset-4 hover:underline">
            List Your Organization
          </Link>
        </div>
      </section>

      <CampusNav current="/campus" />

      <section aria-labelledby="campus-heading">
        <h2 id="campus-heading" className="font-display text-3xl text-ink">
          Choose your campus
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {CAMPUSES.map((c) => (
            <Link key={c.key} href={`/campus/${c.slug}`} className="focus-ring group rounded-[24px] border border-line bg-white p-6 shadow-card hover:border-brand-500">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">{c.short}</p>
              <p className="mt-2 font-display text-xl text-ink">{c.label}</p>
              <p className="mt-2 text-sm text-stone-600">{campusBlurb[c.key]}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-900">
                Explore <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Campus ministries" title="Student organizations and ministries" />
          <Link href="/campus/organizations" className="text-sm font-semibold text-brand-900 underline-offset-4 hover:underline">
            See all ministries
          </Link>
        </div>
        {orgs.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {orgs.slice(0, 6).map((org) => (
              <OrgCard key={org.slug} org={org} />
            ))}
          </div>
        ) : (
          <p className="rounded-[22px] border border-dashed border-line bg-white p-6 text-stone-700">
            Campus ministries are being added as student leaders and staff list them. Every listing is reviewed before it appears.
          </p>
        )}
        <ListOrgCallout />
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Student-Friendly Churches" title="Churches that welcome students" description="Churches that list a college or young-adult ministry, or have shared student-friendly details with us." />
          <Link href="/campus/churches" className="text-sm font-semibold text-brand-900 underline-offset-4 hover:underline">
            See all student-friendly churches
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {churches.slice(0, 6).map((item) => (
            <StudentChurchCard key={item.church.slug} item={item} />
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading eyebrow="Student events" title="Coming up" />
            <Link href="/campus/events" className="text-sm font-semibold text-brand-900 underline-offset-4 hover:underline">
              Full calendar
            </Link>
          </div>
          {events.length ? (
            <CampusEventList events={events.slice(0, 4).map(toEventView)} />
          ) : (
            <p className="rounded-[22px] border border-dashed border-line bg-white p-6 text-stone-700">
              No student events are listed yet.{" "}
              <Link href="/campus/submit-event" className="font-semibold text-brand-900 underline">
                Submit an event
              </Link>{" "}
              and it will appear once reviewed.
            </p>
          )}
        </section>
        <aside className="space-y-5">
          <div className="rounded-[24px] border border-line bg-white p-6 shadow-card">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">New to Champaign-Urbana?</p>
            <p className="mt-2 text-stone-700">How to find a church or ministry, what a first visit is like, and getting around without a car.</p>
            <Link href="/campus/new-to-champaign-urbana" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-900">
              Read the guide <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          {spotlight ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50/60 p-6">
              <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                <Star className="h-3.5 w-3.5" aria-hidden="true" /> Featured church
              </p>
              <p className="mt-2 font-display text-xl text-ink">{spotlight.name}</p>
              <p className="mt-1 text-sm text-stone-600">
                {spotlight.city}
                {spotlightNext ? ` · Next service ${spotlightNext.label}` : ""}
              </p>
              <Link href={`/churches/${spotlight.slug}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-900">
                Plan a visit <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
