import Image from "next/image";
import Link from "next/link";
import { CalendarClock, MapPin, ShieldCheck } from "lucide-react";
import { campusLabel, MEETING_TYPES } from "@/lib/campus";
import { shouldOptimizeImage } from "@/lib/images";

export type OrgSummary = {
  slug: string;
  name: string;
  campuses: string[];
  affiliation: string | null;
  description: string;
  meetingDay: string | null;
  meetingTime: string | null;
  meetingLocation: string | null;
  meetingTypes: string[];
  logoUrl: string | null;
  verifiedAt: Date | null;
  source: string;
};

const typeLabel = (k: string) => MEETING_TYPES.find(([key]) => key === k)?.[1] ?? k;

export function OrgCard({ org }: { org: OrgSummary }) {
  const when = [org.meetingDay, org.meetingTime].filter(Boolean).join(" · ");
  return (
    <article className="flex h-full flex-col rounded-[24px] border border-line bg-white p-5 shadow-card">
      <div className="flex items-start gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-brand-50">
          {org.logoUrl ? (
            <Image src={org.logoUrl} alt="" fill sizes="56px" className="object-contain p-1" unoptimized={!shouldOptimizeImage(org.logoUrl)} />
          ) : (
            <span className="flex h-full items-center justify-center font-display text-xl text-brand-900" aria-hidden="true">
              {org.name.slice(0, 1)}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-xl leading-tight text-ink">
            <Link href={`/campus/organizations/${org.slug}`} className="focus-ring hover:text-brand-700">
              {org.name}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-stone-600">
            {org.campuses.map(campusLabel).join(" · ")}
            {org.affiliation ? ` · ${org.affiliation}` : ""}
          </p>
        </div>
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-700">{org.description}</p>
      <ul className="mt-3 space-y-1 text-sm text-stone-700">
        {when ? (
          <li className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-brand-700" aria-hidden="true" />
            {when}
          </li>
        ) : null}
        {org.meetingLocation ? (
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-700" aria-hidden="true" />
            {org.meetingLocation}
          </li>
        ) : null}
      </ul>
      <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
        {org.verifiedAt ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified by the directory
          </span>
        ) : null}
        {org.source === "public-source" ? <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">From public pages</span> : null}
        {org.meetingTypes.slice(0, 4).map((t) => (
          <span key={t} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-900">
            {typeLabel(t)}
          </span>
        ))}
      </div>
    </article>
  );
}
