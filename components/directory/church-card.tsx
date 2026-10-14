import Image from "next/image";
import Link from "next/link";
import { Globe, MapPin } from "lucide-react";
import type { ChurchRecord } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { PastorBadge } from "@/components/directory/pastor-badge";
import { SaveChurchButton } from "@/components/directory/save-church-button";
import { TrackedLink } from "@/components/directory/tracked-link";
import { VerifiedBadge } from "@/components/directory/verified-badge";
import { shouldOptimizeImage } from "@/lib/images";
import { featureVisible } from "@/lib/plans";
import { externalUrl } from "@/lib/utils";

const cityGradients: Record<string, string> = {
  champaign: "from-brand-700 via-brand-500 to-rose",
  urbana: "from-sage via-brand-500 to-sky",
  savoy: "from-sky via-brand-500 to-rose",
  rantoul: "from-brand-900 via-sage to-brand-500"
};

export function ChurchPhotoPlaceholder({ citySlug, className = "" }: { citySlug: string; className?: string }) {
  const gradient = cityGradients[citySlug] ?? "from-brand-700 via-sage to-sky";
  return (
    <div className={`flex h-full items-center justify-center bg-gradient-to-br ${gradient} px-8 text-center ${className}`}>
      {/* The gradient is decorative; the dark backing keeps the words above 4.5:1 on every colour. */}
      <p className="rounded-full bg-brand-900/80 px-4 py-1.5 font-display text-lg text-white">Photo not yet provided</p>
    </div>
  );
}

export function ChurchCard({ church }: { church: ChurchRecord }) {
  const imageSrc = church.featuredImageUrl ?? church.logoUrl;
  const enhanced = church.enhancedProfile ?? church.premiumProfile;
  const serviceSummary = church.serviceTimes.length
    ? church.serviceTimes.map((service) => `${service.dayOfWeek} ${service.startTime}`).join(" • ")
    : "Service times not yet listed — contact the church";
  const websiteUrl = externalUrl(church.websiteUrl);
  const showLivestream = featureVisible("livestream", enhanced) && church.livestreamUrl;
  const showApp = featureVisible("appLinks", enhanced) && (church.appStoreUrl || church.googlePlayUrl || church.appUrl);

  return (
    <Card className="flex flex-col overflow-hidden border-white/60 bg-white shadow-soft">
      <div className="relative h-48">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={`${church.name}`}
            fill
            sizes="(min-width: 1280px) 40vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
            unoptimized={!shouldOptimizeImage(imageSrc)}
          />
        ) : (
          <ChurchPhotoPlaceholder citySlug={church.citySlug} />
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-900">
            {church.city}
          </span>
          <SaveChurchButton slug={church.slug} name={church.name} compact />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-2">
          <h3 className="font-display text-2xl leading-tight">
            <Link href={`/churches/${church.slug}`} className="hover:underline focus-ring">
              {church.name}
            </Link>
          </h3>
          <VerifiedBadge
            verified={church.verified}
            claimed={church.claimed}
            leadershipConfirmedAt={church.leadershipConfirmedAt}
            publicSourceCheckedAt={church.publicSourceCheckedAt}
          />
          <PastorBadge name={church.pastor.fullName} title={church.pastor.title} />
          <div className="flex flex-wrap gap-2">
            {church.denomination ? (
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-900">{church.denomination}</span>
            ) : null}
            {showLivestream ? <span className="rounded-full bg-rose/15 px-3 py-1 text-xs font-semibold text-[#9a3b1f]">Livestream</span> : null}
            {showApp ? <span className="rounded-full bg-sky px-3 py-1 text-xs font-semibold text-brand-900">Church app</span> : null}
            {church.visitorGuide?.wheelchairAccessible ? (
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-900">Wheelchair accessible</span>
            ) : null}
          </div>
          {church.shortDescription ? <p className="line-clamp-3 text-sm leading-6 text-stone-600">{church.shortDescription}</p> : null}
        </div>

        <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-sm text-stone-700">
          <p className="font-semibold text-ink">Service times</p>
          <p className="mt-1 leading-6">{serviceSummary}</p>
          {church.address1 ? (
            <p className="mt-3 flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
              {church.address1}, {church.city}, {church.state}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          {websiteUrl ? (
            <TrackedLink
              churchSlug={church.slug}
              metric="website_click"
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-brand-900 hover:underline focus-ring"
            >
              <Globe className="h-4 w-4" aria-hidden="true" /> Website<span className="sr-only"> for {church.name} (opens in a new tab)</span>
            </TrackedLink>
          ) : (
            <span />
          )}
          <Link
            href={`/churches/${church.slug}`}
            className="inline-flex min-h-[44px] items-center rounded-full bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-700 focus-ring"
          >
            View details<span className="sr-only"> for {church.name}</span>
          </Link>
        </div>
      </div>
    </Card>
  );
}
