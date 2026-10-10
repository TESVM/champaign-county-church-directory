import type { Metadata } from "next";
import { ChurchCard } from "@/components/directory/church-card";
import { FilterSidebar } from "@/components/directory/filter-sidebar";
import { SearchBar } from "@/components/directory/search-bar";
import { SectionHeading } from "@/components/layout/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { listChurches, listCities, listDenominations, listLanguages, parseChurchFilters } from "@/lib/services/churches";

export const metadata: Metadata = {
  title: "Church Directory",
  description: "Search churches in Champaign County, Illinois by city, denomination, service day and time, language, accessibility, and ministries.",
  alternates: { canonical: "/directory" }
};

function flatten(params: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])) as Record<string, string | undefined>;
}

export default async function DirectoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = flatten(await searchParams);
  const filters = parseChurchFilters(raw);
  const page = Number(raw.page ?? "1") || 1;
  const [results, cities, denominations, languages] = await Promise.all([
    listChurches(filters, page),
    listCities(),
    listDenominations(),
    listLanguages()
  ]);
  const active = Object.entries(raw).filter(([k, v]) => v && k !== "page").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="section-strong overflow-hidden rounded-[36px] border border-white/70 px-6 py-8 shadow-soft sm:px-8">
        <SectionHeading
          as="h1"
          eyebrow="Directory"
          title="Searchable church directory"
          description="Filter by city, denomination, service day and time, language, accessibility, children’s programs, and livestream."
        />
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[320px_1fr]">
        <div className="order-2 lg:order-1">
          <FilterSidebar searchParams={raw} options={{ cities, denominations, languages }} />
        </div>
        <div className="order-1 space-y-5 lg:order-2">
          <SearchBar defaultValue={raw.q} />
          <p className="text-sm font-medium text-stone-700" role="status">
            {results.total === 1 ? "1 church" : `${results.total} churches`} found
            {active ? " with these filters" : ""}
            {results.pageCount > 1 ? ` · page ${results.page} of ${results.pageCount}` : ""}
          </p>
          {results.items.length ? (
            <>
              <div className="grid gap-6 xl:grid-cols-2">
                {results.items.map((church) => (
                  <ChurchCard key={church.id} church={church} />
                ))}
              </div>
              <Pagination page={results.page} pageCount={results.pageCount} basePath="/directory" params={raw} />
            </>
          ) : (
            <EmptyState
              title="No churches matched these filters"
              body={
                filters.wheelchair || filters.children || filters.language
                  ? "Accessibility, children’s program, and language details come from churches themselves, and many have not added them yet. Try removing those filters, or contact a church directly."
                  : "Try a broader city, denomination, or time filter, or clear the filters to see every church."
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
