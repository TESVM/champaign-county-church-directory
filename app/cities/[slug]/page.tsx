import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChurchCard } from "@/components/directory/church-card";
import { SectionHeading } from "@/components/layout/section-heading";
import { absoluteUrl } from "@/lib/utils";
import { getChurchesByCity, getCitiesWithCounts, getCityBySlug } from "@/lib/data/queries";

export function generateStaticParams() {
  return getCitiesWithCounts().map((city) => ({ slug: city.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const city = getCityBySlug(slug);

  if (!city) {
    return {};
  }

  return {
    title: `${city.name} Churches | Champaign County Church Directory`,
    description: `Browse churches in ${city.name}, Illinois with pastor info, service times, websites, and directions.`,
    alternates: {
      canonical: absoluteUrl(`/cities/${city.slug}`)
    }
  };
}

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const city = getCityBySlug(slug);

  if (!city) {
    notFound();
  }

  const churches = getChurchesByCity(city.slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="section-strong overflow-hidden rounded-[36px] border border-white/70 px-6 py-8 shadow-soft sm:px-8">
        <SectionHeading
          eyebrow={`${churches.length} churches`}
          title={`${city.name} churches`}
          description={city.description}
        />
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white">
          {city.name}, Illinois
        </div>
        <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-stone-700 ring-1 ring-brand-100">
          {churches.length} listings
        </div>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {churches.length ? churches.map((church) => <ChurchCard key={church.id} church={church} />) : <p>No churches yet.</p>}
      </div>
    </div>
  );
}
