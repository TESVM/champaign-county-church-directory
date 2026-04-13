import { ChurchRecord } from "@/lib/types";
import { ChurchCard } from "@/components/directory/church-card";
import { SectionHeading } from "@/components/layout/section-heading";

export function FeaturedChurches({ churches }: { churches: ChurchRecord[] }) {
  return (
    <section className="section-wash rounded-[40px] px-6 py-8 shadow-soft sm:px-8">
      <SectionHeading
        eyebrow="Featured Churches"
        title="Welcoming congregations across Champaign County"
        description="A few highlighted listings with complete details, clear service information, and strong local presence."
      />
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {churches.map((church) => (
          <ChurchCard key={church.id} church={church} />
        ))}
      </div>
    </section>
  );
}
