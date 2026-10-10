import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Clock3, PlayCircle, Radio, Star } from "lucide-react";
import { SectionHeading } from "@/components/layout/section-heading";
import { getWorshipHub } from "@/lib/services/live";
import { formatChicago } from "@/lib/time/chicago";

export const metadata: Metadata = {
  title: "Worship Live & Next: Church Services Streaming and Coming Up",
  description: "Churches in Champaign County streaming now, the next services across the county, and recent services from churches’ own YouTube channels.",
  alternates: { canonical: "/live" }
};

export default async function LivePage() {
  const hub = await getWorshipHub();
  const asOf = formatChicago(hub.checkedAt, { hour: "numeric", minute: "2-digit" });

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeading
        as="h1"
        eyebrow="Worship Live & Next"
        title="Worship with a church today"
        description="Who is streaming now, what services are coming up next across Champaign County, and recent services from churches’ own channels."
      />

      <section aria-labelledby="live-heading" className="space-y-4">
        <h2 id="live-heading" className="flex items-center gap-2 font-display text-3xl text-ink">
          <Radio className="h-7 w-7 text-red-700" aria-hidden="true" /> Live now
        </h2>
        {hub.live.length ? (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {hub.live.map(({ church, markedAt }) => (
              <li key={church.slug} className="rounded-[24px] border border-red-200 bg-white p-5 shadow-card">
                <p className="inline-flex items-center gap-1.5 rounded-full bg-red-700 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  <span className="h-2 w-2 rounded-full bg-white" aria-hidden="true" /> Live
                </p>
                <h3 className="mt-3 font-display text-xl text-ink">
                  <Link href={`/churches/${church.slug}`} className="hover:text-brand-700">
                    {church.name}
                  </Link>
                </h3>
                <p className="text-sm text-stone-600">{church.city}</p>
                <a href={church.livestreamUrl!} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-700">
                  <PlayCircle className="h-4 w-4" aria-hidden="true" /> Watch on the church’s page
                </a>
                {markedAt ? <p className="mt-3 text-xs text-stone-500">Marked live by the church at {formatChicago(markedAt, { hour: "numeric", minute: "2-digit" })}.</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[22px] border border-dashed border-line bg-white p-6 text-stone-700">
            No church has marked itself live right now (as of {asOf}). We only show a church as live when its own team says so, so a church may be streaming without appearing here. Check the next services below.
          </p>
        )}
      </section>

      <section aria-labelledby="next-heading" className="space-y-4">
        <h2 id="next-heading" className="flex items-center gap-2 font-display text-3xl text-ink">
          <Clock3 className="h-7 w-7 text-brand-700" aria-hidden="true" /> Coming up next
        </h2>
        {hub.next.length ? (
          <ol className="divide-y divide-line overflow-hidden rounded-[24px] border border-line bg-white shadow-card">
            {hub.next.map((n) => (
              <li key={`${n.church.slug}-${n.at.toISOString()}`} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-700">{n.label}</p>
                  <p className="font-display text-lg text-ink">
                    <Link href={`/churches/${n.church.slug}`} className="hover:text-brand-700">
                      {n.church.name}
                    </Link>
                    {n.church.featured ? (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 align-middle text-xs font-semibold text-amber-800">
                        <Star className="h-3 w-3" aria-hidden="true" /> Featured
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-stone-600">
                    {n.serviceName} · {n.church.city}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {n.watchUrl ? (
                    <a href={n.watchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink hover:bg-brand-50">
                      <PlayCircle className="h-4 w-4" aria-hidden="true" /> Watch online
                    </a>
                  ) : null}
                  <Link href={`/churches/${n.church.slug}#plan-your-visit`} className="inline-flex min-h-[44px] items-center rounded-full bg-brand-900 px-4 text-sm font-semibold text-white hover:bg-brand-700">
                    Plan a visit
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-stone-700">No upcoming service times are listed yet.</p>
        )}
        <p className="text-sm text-stone-600">
          Times come from each church’s listing (Central Time). Looking for a specific day or time? Try{" "}
          <Link href="/find-a-service" className="underline">
            Find a Service
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="recent-heading" className="space-y-4">
        <h2 id="recent-heading" className="flex items-center gap-2 font-display text-3xl text-ink">
          <PlayCircle className="h-7 w-7 text-brand-700" aria-hidden="true" /> Recent services
        </h2>
        {hub.recent.length ? (
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {hub.recent.map(({ church, video }) => (
              <li key={video.id} className="overflow-hidden rounded-[24px] border border-line bg-white shadow-card">
                <a href={video.url} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="relative aspect-video bg-stone-900">
                    {video.thumbnailUrl ? <Image src={video.thumbnailUrl} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" unoptimized /> : null}
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-2 font-semibold text-ink">{video.title}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      {church.name} · {formatChicago(video.publishedAt, { month: "short", day: "numeric" })} · YouTube
                    </p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[22px] border border-dashed border-line bg-white p-6 text-stone-700">Recent services appear here from churches that list a public YouTube channel on an Enhanced profile.</p>
        )}
      </section>

      <aside className="rounded-[24px] bg-stone-50 p-6 text-sm leading-6 text-stone-700">
        <p className="font-semibold text-ink">For churches</p>
        <p className="mt-1">
          Streaming this Sunday? Church teams with an Enhanced profile can mark the church live from their dashboard for 1 to 4 hours. Add your YouTube channel link to your listing and your latest service appears here automatically.{" "}
          <Link href="/for-churches" className="underline">
            Learn more
          </Link>
          .
        </p>
      </aside>
    </div>
  );
}
