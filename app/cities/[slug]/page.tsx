import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChurchCard } from "@/components/directory/church-card";
import { SectionHeading } from "@/components/layout/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { getCity, listChurches } from "@/lib/services/churches";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const city = await getCity(slug);
  if (!city) return {};
  return {
    title: `Churches in ${city.name}, IL`,
    description: `Browse ${city.churchCount} churches in ${city.name}, Illinois with service times, pastors, and directions.`,
    alternates: { canonical: `/cities/${city.slug}` }
  };
}

export default async function CityPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> }) {
  const { slug } = await params;
  const { page } = await searchParams;
  const city = await getCity(slug);
  if (!city) notFound();
  const results = await listChurches({ city: city.slug }, Number(page ?? "1") || 1, 24);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="section-strong overflow-hidden rounded-[36px] border border-white/70 px-6 py-8 shadow-soft sm:px-8">
        <SectionHeading
          as="h1"
          eyebrow={`${results.total} ${results.total === 1 ? "church" : "churches"}`}
          title={`Churches in ${city.name}, Illinois`}
          description={city.description || `Churches listed in ${city.name}.`}
        />
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
