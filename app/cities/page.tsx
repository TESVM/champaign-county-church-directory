import type { Metadata } from "next";
import { CityCard } from "@/components/directory/city-card";
import { SectionHeading } from "@/components/layout/section-heading";
import { listCities } from "@/lib/services/churches";

export const metadata: Metadata = {
  title: "Churches by City",
  description: "Browse churches in Champaign, Urbana, Savoy, Rantoul, Mahomet, and other Champaign County communities.",
  alternates: { canonical: "/cities" }
};

export default async function CitiesPage() {
  const cities = await listCities();
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        as="h1"
        eyebrow="Cities"
        title="Browse churches by city in Champaign County"
        description="Communities with at least one listed church. Know a church we are missing? Submit it for review."
      />
      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cities.map((city) => (
          <CityCard key={city.id} {...city} />
        ))}
      </div>
    </div>
  );
}
