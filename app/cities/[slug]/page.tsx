import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChurchCard } from "@/components/directory/church-card";
import { SectionHeading } from "@/components/layout/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import Link from "next/link";
import { breadcrumbs, churchItemList, JsonLd } from "@/components/seo/json-ld";
import { MIN_FAMILY_SIZE } from "@/lib/denominations";
import { getCity, listChurches, listDenominationFamilies } from "@/lib/services/churches";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const city = await getCity(slug);
  if (!city) return {};
  return {
    title: `Churches in ${city.name}, IL`,
    description: `Find a church in ${city.name}, Illinois: ${city.churchCount} churches with service times, pastors, addresses, directions, and when each listing was last checked.`,
    alternates: { canonical: `/cities/${city.slug}` }
  };
}

export default async function CityPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> }) {
  const { slug } = await params;
  const { page } = await searchParams;
  const city = await getCity(slug);
  if (!city) notFound();
  const [results, families, countyFamilies] = await Promise.all([
    listChurches({ city: city.slug }, Number(page ?? "1") || 1, 24),
    listDenominationFamilies({ citySlug: city.slug }),
    listDenominationFamilies()
  ]);
  // Link only to denomination pages that exist (enough churches county-wide).
  const linkable = new Set(countyFamilies.filter((g) => g.churches.length >= MIN_FAMILY_SIZE).map((g) => g.family.slug));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={breadcrumbs([{ name: "Home", path: "/" }, { name: "Cities", path: "/cities" }, { name: city.name, path: `/cities/${city.slug}` }])} />
      <JsonLd data={churchItemList(`Churches in ${city.name}, Illinois`, results.items)} />
      <div className="section-strong overflow-hidden rounded-[36px] border border-white/70 px-6 py-8 shadow-soft sm:px-8">
        <SectionHeading
          as="h1"
          eyebrow={`${results.total} ${results.total === 1 ? "church" : "churches"}`}
          title={`Churches in ${city.name}, Illinois`}
          description={city.description || `Churches listed in ${city.name}.`}
        />
        {families.length ? (
          <div className="mt-6">
            <p className="text-sm font-medium text-stone-700">Denominations in {city.name}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {families.map(({ family, churches }) => (
                <li key={family.slug}>
                  {linkable.has(family.slug) ? (
                    <Link href={`/denominations/${family.slug}`} className="focus-ring inline-flex min-h-[40px] items-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-brand-900 hover:bg-brand-50">
                      {family.name} ({churches.length})
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-[40px] items-center rounded-full bg-white/70 px-4 text-sm text-stone-700">
                      {family.name} ({churches.length})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {results.items.length ? (
          results.items.map((church) => <ChurchCard key={church.id} church={church} />)
        ) : (
          <EmptyState title={`No churches listed in ${city.name} yet`} body="Know one? Use “Submit a church” so we can add it." />
        )}
      </div>
      <Pagination page={results.page} pageCount={results.pageCount} basePath={`/cities/${city.slug}`} params={{}} />
    </div>
  );
}
