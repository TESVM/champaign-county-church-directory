import Image from "next/image";
import Link from "next/link";
import { Globe, MapPin, PlayCircle, Smartphone } from "lucide-react";
import { ChurchRecord } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PastorBadge } from "@/components/directory/pastor-badge";
import { SocialIcons } from "@/components/directory/social-icons";
import { VerifiedBadge } from "@/components/directory/verified-badge";

const cityGradients: Record<string, string> = {
  champaign: "from-brand-700 via-brand-500 to-rose",
  urbana: "from-sage via-brand-500 to-sky",
  savoy: "from-sky via-brand-500 to-rose",
  rantoul: "from-brand-900 via-sage to-brand-500"
};

export function ChurchCard({ church }: { church: ChurchRecord }) {
  const gradient = cityGradients[church.citySlug] ?? "from-brand-700 via-sage to-sky";
  const imageSrc =
    church.featuredImageUrl ??
    church.logoUrl ??
    "https://images.unsplash.com/photo-1518733057094-95b53143d2a7?auto=format&fit=crop&w=1200&q=80";
  const serviceSummary =
    church.serviceTimes.length
      ? church.serviceTimes.map((service) => `${service.dayOfWeek} ${service.startTime}`).join(" • ")
      : "Service times not yet listed";

  return (
    <Card className="overflow-hidden border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(238,248,248,0.88))] shadow-soft">
      <div className="relative h-52">
        <Image src={imageSrc} alt={church.name} fill className="object-cover" />
        <div className={`absolute inset-0 bg-gradient-to-t ${gradient} opacity-45`} />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-900">
            {church.city}
          </span>
          <VerifiedBadge verified={church.verified} claimed={church.claimed} />
        </div>
      </div>
        <div className="space-y-5 p-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="mt-2 font-display text-2xl">{church.name}</h3>
            </div>
          </div>
          <PastorBadge name={church.pastor.fullName} title={church.pastor.title} />
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-900">
              {church.denomination ?? "Community Church"}
            </span>
            {church.livestreamUrl ? (
              <span className="rounded-full bg-rose/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose">
                Livestream
              </span>
            ) : null}
            {church.appUrl ? (
              <span className="rounded-full bg-sky px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-900">
                App available
              </span>
            ) : null}
          </div>
          <p className="text-base leading-7 text-stone-600">{church.shortDescription}</p>
        </div>

        <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-sky/40 p-4 text-sm text-stone-700">
          <p className="font-semibold text-ink">Service Times</p>
          <p className="mt-1 leading-6">{serviceSummary}</p>
          <p className="mt-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-700" />
            {church.address1}, {church.city}, {church.state}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {church.websiteUrl ? (
            <Button asChild size="sm" className="bg-gradient-to-r from-brand-700 to-brand-900">
              <Link href={church.websiteUrl} target="_blank" rel="noreferrer">
                <Globe className="mr-2 h-4 w-4" />
                Website
              </Link>
            </Button>
          ) : null}
          {church.appUrl ? (
            <Button asChild size="sm" variant="secondary">
              <Link href={church.appUrl} target="_blank" rel="noreferrer">
                <Smartphone className="mr-2 h-4 w-4" />
                App
              </Link>
            </Button>
          ) : null}
          {church.livestreamUrl ? (
            <Button asChild size="sm" variant="secondary">
              <Link href={church.livestreamUrl} target="_blank" rel="noreferrer">
                <PlayCircle className="mr-2 h-4 w-4" />
                Livestream
              </Link>
            </Button>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-line pt-2">
          <SocialIcons links={church.socialLinks} />
          <Button asChild variant="ghost">
            <Link href={`/churches/${church.slug}`}>View Details</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
