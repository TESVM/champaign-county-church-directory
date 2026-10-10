import type { Metadata } from "next";
import Link from "next/link";
import { FilterSidebar } from "@/components/directory/filter-sidebar";
import { SectionHeading } from "@/components/layout/section-heading";
import { ChurchMap } from "@/components/map/church-map";
import { ResponsiveDetails } from "@/components/map/responsive-details";
import { listChurchesForMap, listCities, listDenominations, listLanguages, parseChurchFilters } from "@/lib/services/churches";

export const metadata: Metadata = {
  title: "Explore the Map",
  description: "See churches across Champaign County on a map. Filter by city, denomination, service time, language, accessibility, children’s programs, and livestream.",
  alternates: { canonical: "/map" }
};

function flatten(params: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])) as Record<string, string | undefined>;
}

export default async function MapPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = flatten(await searchParams);
  const [pins, cities, denominations, languages] = await Promise.all([
    listChurchesForMap(parseChurchFilters(raw)),
    listCities(),
    listDenominations(),
    listLanguages()
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeading
        as="h1"
        eyebrow="Explore the Map"
        title="Churches across Champaign County"
        description="Tap a pin to preview a church, switch to the list for an easier read, or use Near me to sort by distance. Your location never leaves your browser."
      />
      <div className="mt-8 grid gap-8 lg:grid-cols-[300px_1fr]">
        <ResponsiveDetails summary="Filters" defaultOpen={Object.entries(raw).some(([k, v]) => v && k !== "view")}>
          <FilterSidebar searchParams={raw} options={{ cities, denominations, languages }} action="/map" />
        </ResponsiveDetails>
        <div>
          <ChurchMap pins={pins} initialView={raw.view === "list" ? "list" : "map"} />
          <p className="mt-4 text-xs text-stone-500">
            Pins come from each church’s listed street address. “Featured” churches are highlighted by the directory and are always labeled. Something wrong?{" "}
            <Link href="/contact" className="underline">
              Tell us
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
