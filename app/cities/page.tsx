import { CityCard } from "@/components/directory/city-card";
import { SectionHeading } from "@/components/layout/section-heading";
import { getCitiesWithCounts } from "@/lib/data/queries";

export default function CitiesPage() {
  const cities = getCitiesWithCounts();

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Cities"
        title="Browse churches by city in Champaign County"
        description="Each city section highlights local churches, quick details, and an easy path to service times, pastor information, and directions."
      />
      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cities.map((city) => (
          <CityCard key={city.id} {...city} />
        ))}
      </div>
    </div>
  );
}
