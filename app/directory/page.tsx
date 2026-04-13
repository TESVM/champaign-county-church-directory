import { ChurchCard } from "@/components/directory/church-card";
import { FilterSidebar } from "@/components/directory/filter-sidebar";
import { SearchBar } from "@/components/directory/search-bar";
import { SectionHeading } from "@/components/layout/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { getDirectoryResults } from "@/lib/data/queries";

export default async function DirectoryPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const normalized = Object.fromEntries(
    Object.entries(resolvedSearchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
  ) as Record<string, string | undefined>;
  const results = getDirectoryResults(normalized);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="section-strong overflow-hidden rounded-[36px] border border-white/70 px-6 py-8 shadow-soft sm:px-8">
        <SectionHeading
          eyebrow="Directory"
          title="Searchable church directory"
          description="Filter by city, denomination, senior pastor, service day, ministries, website, app, livestream, and verification status."
        />
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-[320px_1fr]">
        <FilterSidebar searchParams={normalized} />
        <div className="space-y-5">
          <SearchBar defaultValue={normalized.q} />
          <div className="rounded-[24px] border border-white/70 bg-gradient-to-r from-brand-900 via-brand-700 to-brand-500 px-5 py-4 text-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/80">Directory results</p>
              <p className="rounded-full bg-white/14 px-3 py-1 text-sm font-medium text-white/90">{results.length} churches found</p>
            </div>
          </div>
          {results.length ? (
            <>
              <div className="grid gap-6 xl:grid-cols-2">
                {results.map((church) => (
                  <ChurchCard key={church.id} church={church} />
                ))}
              </div>
              <Pagination />
            </>
          ) : (
            <EmptyState title="No churches matched these filters" body="Try a broader city, pastor, denomination, or ministry filter to see more churches." />
          )}
        </div>
      </div>
    </div>
  );
}
