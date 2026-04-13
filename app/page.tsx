import Link from "next/link";
import { ArrowRight, Music2, Search, ShieldCheck, Smartphone } from "lucide-react";
import { HeroSearch } from "@/components/directory/hero-search";
import { CityCard } from "@/components/directory/city-card";
import { ChurchOfTheWeek } from "@/components/directory/church-of-the-week";
import { FeaturedChurches } from "@/components/directory/featured-churches";
import { PinnedChurchSpotlight } from "@/components/directory/pinned-church-spotlight";
import { RecentlyUpdated } from "@/components/directory/recently-updated";
import { SectionHeading } from "@/components/layout/section-heading";
import { Button } from "@/components/ui/button";
import { getChurchOfTheWeek, getCitiesWithCounts, getFeaturedChurches, getPinnedFrontPageChurch, getRecentlyUpdatedChurches } from "@/lib/data/queries";
import { musicianDirectoryUrl } from "@/lib/utils";

const featureItems = [
  {
    title: "Search by how people actually look",
    description: "Filter by city, denomination, pastor, ministries, service day, website, app, and livestream.",
    icon: Search
  },
  {
    title: "Spot verified and maintained listings",
    description: "Quickly see churches with fuller information and signs of active upkeep.",
    icon: ShieldCheck
  },
  {
    title: "Jump straight to websites, apps, and streams",
    description: "Reduce friction for visitors who just need the next clear step.",
    icon: Smartphone
  }
];

const quickLinks = [
  {
    title: "Browse churches",
    description: "Open the full directory and scan church listings side by side.",
    href: "/directory"
  },
  {
    title: "Browse by city",
    description: "Start with Champaign, Urbana, Savoy, Mahomet, and nearby communities.",
    href: "/cities"
  },
  {
    title: "Submit a church",
    description: "Add a new church listing for review and publishing.",
    href: "/submit"
  },
  {
    title: "Find musicians",
    description: "Open the companion musician directory for worship and event needs.",
    href: musicianDirectoryUrl("/")
  }
];

export default function HomePage() {
  const cities = getCitiesWithCounts().slice(0, 6);
  const churchOfTheWeek = getChurchOfTheWeek();
  const pinnedChurch = getPinnedFrontPageChurch();
  const featuredChurches = getFeaturedChurches();
  const recentlyUpdated = getRecentlyUpdatedChurches();

  return (
    <div className="pb-20">
      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:pt-16">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">Champaign County, Illinois</p>
          <h1 className="mt-5 font-display text-5xl leading-tight text-ink sm:text-6xl">
            Find churches by city, service style, ministries, and pastoral leadership.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-700">
            A clean, searchable directory for residents, students, families, and visitors looking for a church home across Champaign County.
          </p>
          <HeroSearch />
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/directory">
                Browse Churches
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <a href={musicianDirectoryUrl("/")} target="_blank" rel="noreferrer">
                <Music2 className="mr-2 h-4 w-4" />
                Need Musicians?
              </a>
            </Button>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ["80+", "Church listings across the county"],
              ["Cities", "Browse by community instead of guessing"],
              ["Clear", "Easy links to websites, apps, and livestreams"]
            ].map(([value, label]) => (
              <div key={label} className="rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-card">
                <p className="text-2xl font-semibold text-ink">{value}</p>
                <p className="mt-2 text-sm leading-7 text-stone-600">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="section-strong rounded-[36px] border border-white/70 p-6 shadow-soft sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">Why this directory works</p>
          <div className="mt-6 space-y-4">
            {featureItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[24px] border border-white/70 bg-white/75 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-700 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="font-display text-2xl text-ink">{item.title}</h2>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-stone-600">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section aria-labelledby="church-quick-links-heading" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-card sm:p-8">
          <h2 id="church-quick-links-heading" className="font-display text-3xl text-ink">
            Quick paths
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {quickLinks.map((item) => (
              <div key={item.title} className="rounded-[24px] border border-white/80 bg-brand-50/60 p-5">
                <h3 className="font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-stone-700">{item.description}</p>
                {item.href.startsWith("http") ? (
                  <a href={item.href} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-semibold text-brand-900 underline-offset-4 hover:underline focus-ring">
                    Open link
                  </a>
                ) : (
                  <Link href={item.href} className="mt-4 inline-flex text-sm font-semibold text-brand-900 underline-offset-4 hover:underline focus-ring">
                    Open link
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {pinnedChurch ? (
        <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <PinnedChurchSpotlight church={pinnedChurch} />
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Browse by City"
          title="Start with the community you know"
          description="Explore churches in Champaign, Urbana, Savoy, Mahomet, Rantoul, and other Champaign County communities."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {cities.map((city) => (
            <CityCard key={city.slug} {...city} />
          ))}
        </div>
      </section>

      {churchOfTheWeek ? (
        <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <ChurchOfTheWeek church={churchOfTheWeek} />
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <FeaturedChurches churches={featuredChurches} />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Recently Updated"
          title="Freshly reviewed listings"
          description="A quick look at church records that were updated most recently."
        />
        <div className="mt-10">
          <RecentlyUpdated churches={recentlyUpdated} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <div className="rounded-[36px] bg-[linear-gradient(135deg,#12363e,#2f8f88_55%,#f28b66)] px-8 py-10 text-white shadow-soft sm:px-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/80">Music Ministry</p>
            <h2 className="mt-4 font-display text-4xl">Need a worship musician or vocalist for your church?</h2>
            <p className="mt-4 text-lg leading-8 text-white/88">
              We now run a separate musician directory for churches, pastors, worship leaders, and event planners who need dependable local talent.
            </p>
          </div>
          <div className="mt-8">
            <Button asChild variant="secondary">
              <a href={musicianDirectoryUrl("/")} target="_blank" rel="noreferrer">
                Visit the Musician Directory
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
