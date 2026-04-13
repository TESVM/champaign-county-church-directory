import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { ChurchRecord } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { PastorBadge } from "@/components/directory/pastor-badge";
import { Button } from "@/components/ui/button";

export function PinnedChurchSpotlight({ church }: { church: ChurchRecord }) {
  return (
    <Card className="border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_24%),linear-gradient(135deg,#12363e_0%,#1f5f63_36%,#f28b66_100%)] p-8 text-white shadow-soft">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-100">Always Featured</p>
          <h2 className="mt-4 font-display text-4xl">Sheriff Temple AOH Church of God</h2>
          <p className="mt-4 text-base leading-8 text-white/90">
            Kept on the front page as a permanent neighborhood spotlight so visitors can quickly find this Champaign congregation.
          </p>
          <div className="mt-5">
            <PastorBadge name={church.pastor.fullName} title={church.pastor.title} />
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm text-white/85">
            <MapPin className="h-4 w-4" />
            {church.address1}, {church.city}, {church.state} {church.zip}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {church.websiteUrl ? (
            <Button asChild variant="secondary" className="bg-white text-brand-900 hover:bg-brand-50">
              <Link href={church.websiteUrl} target="_blank" rel="noreferrer">
                Visit Church Website
              </Link>
            </Button>
          ) : null}
          <Button asChild className="bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/20">
            <Link href={`/churches/${church.slug}`}>
              View Full Profile
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
