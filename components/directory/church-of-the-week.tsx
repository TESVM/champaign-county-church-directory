import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Globe, MapPin, PlayCircle, Smartphone } from "lucide-react";
import { ChurchRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PastorBadge } from "@/components/directory/pastor-badge";
import { SocialIcons } from "@/components/directory/social-icons";
import { VerifiedBadge } from "@/components/directory/verified-badge";
import { SectionHeading } from "@/components/layout/section-heading";
import { externalUrl } from "@/lib/utils";

export function ChurchOfTheWeek({ church }: { church: ChurchRecord }) {
  const imageSrc =
    church.featuredImageUrl ??
    church.logoUrl ??
    "https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=1200&q=80";
  const websiteUrl = externalUrl(church.websiteUrl);
  const appUrl = externalUrl(church.appUrl);
  const livestreamUrl = externalUrl(church.livestreamUrl);

  return (
    <section className="section-wash rounded-[40px] px-6 py-8 sm:px-8">
      <SectionHeading
        eyebrow="Church of the Week"
        title={`Featured this week: ${church.name}`}
        description="A weekly spotlight on one local church so visitors can quickly discover a welcoming congregation, see real details, and plan a visit."
      />
      <Card className="mt-10 overflow-hidden border-white/70 bg-white/90 shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[320px]">
            <Image src={imageSrc} alt={church.name} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-900/75 via-brand-700/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-100">{church.city}, Illinois</p>
              <h3 className="mt-3 font-display text-4xl">{church.name}</h3>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/90">{church.shortDescription}</p>
            </div>
          </div>

          <div className="p-8">
            <div className="flex flex-wrap items-center gap-3">
              <VerifiedBadge verified={church.verified} claimed={church.claimed} />
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-900">
                Community Spotlight
              </span>
            </div>

            <div className="mt-6">
              <PastorBadge name={church.pastor.fullName} title={church.pastor.title} />
            </div>

            <p className="mt-6 text-base leading-8 text-stone-600">{church.description}</p>

            <div className="mt-6 rounded-[24px] bg-gradient-to-br from-brand-50 to-sky p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">This Week’s Visit Snapshot</p>
              <div className="mt-4 space-y-3 text-sm text-stone-700">
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand-700" />
                  {church.address1}, {church.city}, {church.state} {church.zip}
                </p>
                <p>
                  <span className="font-semibold text-ink">Next service:</span>{" "}
                  {church.serviceTimes[0]
                    ? `${church.serviceTimes[0].dayOfWeek} at ${church.serviceTimes[0].startTime}`
                    : "Check church website for service times"}
                </p>
                <p>
                  <span className="font-semibold text-ink">Ministries:</span> {church.ministries.slice(0, 4).join(", ")}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {websiteUrl ? (
                <Button asChild className="bg-gradient-to-r from-brand-700 to-brand-900">
                  <a href={websiteUrl} target="_blank" rel="noreferrer">
                    <Globe className="mr-2 h-4 w-4" />
                    Visit Website
                  </a>
                </Button>
              ) : null}
              {appUrl ? (
                <Button asChild variant="secondary">
                  <a href={appUrl} target="_blank" rel="noreferrer">
                    <Smartphone className="mr-2 h-4 w-4" />
                    Open App
                  </a>
                </Button>
              ) : null}
              {livestreamUrl ? (
                <Button asChild variant="secondary">
                  <a href={livestreamUrl} target="_blank" rel="noreferrer">
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Livestream
                  </a>
                </Button>
              ) : null}
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <SocialIcons links={church.socialLinks} />
              <Link href={`/churches/${church.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-900">
                View full profile
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
