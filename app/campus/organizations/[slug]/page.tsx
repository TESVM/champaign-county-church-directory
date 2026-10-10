import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ExternalLink, Info, Mail, MapPin, ShieldCheck } from "lucide-react";
import { CampusNav } from "@/components/campus/campus-nav";
import { CampusEventList } from "@/components/campus/event-list";
import { getActor } from "@/lib/auth";
import { campusLabel, MEETING_TYPES } from "@/lib/campus";
import { toEventView } from "@/lib/campus-format";
import { shouldOptimizeImage } from "@/lib/images";
import { getOrganization, listCampusEvents } from "@/lib/services/campus";
import { siteUrl } from "@/lib/site";
import { formatChicago } from "@/lib/time/chicago";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const org = await getOrganization((await params).slug);
  if (!org) return { title: "Organization not found", robots: { index: false } };
  return {
    title: `${org.name}: Campus Ministry in Champaign-Urbana`,
    description: org.description.slice(0, 160),
    alternates: { canonical: `/campus/organizations/${org.slug}` }
  };
}

export default async function OrganizationPage({ params }: Props) {
  const org = await getOrganization((await params).slug, await getActor());
  if (!org) notFound();
  const events = (await listCampusEvents({ days: 120 })).filter((e) => e.host.href === `/campus/organizations/${org.slug}`);
  const when = [org.meetingDay, org.meetingTime].filter(Boolean).join(" · ");
  const links = [
    ["Website", org.websiteUrl],
    ["Instagram", org.instagramUrl],
    ["Facebook", org.facebookUrl],
    ["Other", org.otherSocialUrl],
    ["Sign up or register", org.registrationUrl]
  ].filter((l): l is [string, string] => Boolean(l[1]));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: org.name,
    url: `${siteUrl()}/campus/organizations/${org.slug}`,
    description: org.description,
    ...(org.websiteUrl ? { sameAs: [org.websiteUrl, org.instagramUrl, org.facebookUrl].filter(Boolean) } : {})
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CampusNav current="/campus/organizations" />
      {org.status !== "APPROVED" ? (
        <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">Staff preview: this listing is {org.status.toLowerCase()} and not public.</p>
      ) : null}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-line bg-brand-50">
          {org.logoUrl ? (
            <Image src={org.logoUrl} alt={`${org.name} logo`} fill sizes="96px" className="object-contain p-2" unoptimized={!shouldOptimizeImage(org.logoUrl)} />
          ) : (
            <span className="flex h-full items-center justify-center font-display text-4xl text-brand-900" aria-hidden="true">
              {org.name.slice(0, 1)}
            </span>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">{org.campuses.map(campusLabel).join(" · ")}</p>
          <h1 className="mt-1 font-display text-4xl text-ink">{org.name}</h1>
          {org.affiliation ? <p className="mt-1 text-stone-600">{org.affiliation}</p> : null}
          {org.church ? (
            <p className="mt-1 text-sm">
              Partner church:{" "}
              <Link href={`/churches/${org.church.slug}`} className="font-semibold text-brand-900 underline">
                {org.church.name}
              </Link>
            </p>
          ) : null}
        </div>
      </header>

      <div className="grid gap-8 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <p className="whitespace-pre-line text-lg leading-8 text-stone-800">{org.description}</p>
          {org.whoIsWelcome ? (
            <section>
              <h2 className="font-display text-2xl">Who is welcome</h2>
              <p className="mt-2 whitespace-pre-line text-stone-700">{org.whoIsWelcome}</p>
            </section>
          ) : null}
          {org.firstTimeNote ? (
            <section>
              <h2 className="font-display text-2xl">Your first time</h2>
              <p className="mt-2 whitespace-pre-line text-stone-700">{org.firstTimeNote}</p>
            </section>
          ) : null}
          {org.accessibilityNote ? (
            <section>
              <h2 className="font-display text-2xl">Accessibility</h2>
              <p className="mt-2 whitespace-pre-line text-stone-700">{org.accessibilityNote}</p>
            </section>
          ) : null}
          {events.length ? (
            <section className="space-y-3">
              <h2 className="font-display text-2xl">Upcoming events</h2>
              <CampusEventList events={events.map(toEventView)} />
            </section>
          ) : null}
        </div>
        <aside className="space-y-4">
          <div className="space-y-3 rounded-[24px] border border-line bg-white p-5 shadow-card text-sm text-stone-700">
            <h2 className="font-display text-xl text-ink">Meets</h2>
            {when ? (
              <p className="flex gap-2">
                <CalendarClock className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" /> {when}
              </p>
            ) : (
              <p>Meeting times not listed. Check their links below.</p>
            )}
            {org.meetingLocation ? (
              <p className="flex gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" /> {org.meetingLocation}
              </p>
            ) : null}
            {org.meetingTypes.length ? <p>{org.meetingTypes.map((t) => MEETING_TYPES.find(([k]) => k === t)?.[1] ?? t).join(" · ")}</p> : null}
          </div>
          {links.length || (org.publishContact && org.publicContactEmail) ? (
            <div className="space-y-2 rounded-[24px] border border-line bg-white p-5 shadow-card">
              <h2 className="font-display text-xl text-ink">Connect</h2>
              {links.map(([label, url]) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="flex min-h-[40px] items-center gap-2 text-sm font-semibold text-brand-900 hover:underline">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" /> {label}
                </a>
              ))}
              {org.publishContact && org.publicContactEmail ? (
                <a href={`mailto:${org.publicContactEmail}`} className="flex min-h-[40px] items-center gap-2 text-sm font-semibold text-brand-900 hover:underline">
                  <Mail className="h-4 w-4" aria-hidden="true" /> {org.publicContactName ? `${org.publicContactName}${org.publicContactRole ? `, ${org.publicContactRole}` : ""}` : "Email"}
                </a>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-2 rounded-[24px] bg-stone-50 p-5 text-xs leading-5 text-stone-600">
            <p className="flex items-center gap-1.5 font-semibold text-stone-700">
              {org.verifiedAt ? <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" /> : <Info className="h-4 w-4" aria-hidden="true" />}
              {org.verifiedAt ? `Verified by the directory ${formatChicago(org.verifiedAt, { month: "short", year: "numeric" })}` : "Not yet verified"}
            </p>
            <p>{org.source === "organization" ? "Listed by the organization’s own leaders." : "Compiled from the organization’s public website or pages."}</p>
            {org.lastCheckedAt ? <p>Last checked {formatChicago(org.lastCheckedAt, { month: "long", day: "numeric", year: "numeric" })}.</p> : null}
            <p>
              Lead this group?{" "}
              <Link href="/contact" className="underline">
                Request a change
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
