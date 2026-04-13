import { ChurchCard } from "@/components/directory/church-card";
import { SearchBar } from "@/components/directory/search-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { getDirectoryResults } from "@/lib/data/queries";

export default async function SearchPage({
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
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">Search Results</p>
      <h1 className="mt-4 font-display text-5xl">Results for “{normalized.q ?? "all churches"}”</h1>
      <p className="mt-4 text-lg text-stone-600">{results.length} churches matched your search.</p>
      <div className="mt-8 max-w-2xl">
        <SearchBar defaultValue={normalized.q} />
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {results.length ? results.map((church) => <ChurchCard key={church.id} church={church} />) : <EmptyState title="No search results" body="Try searching by city, pastor, denomination, or service day instead." />}
      </div>
    </div>
  );
}
