import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/layout/section-heading";

const values = [
  "Help residents and visitors compare churches without jumping across disconnected websites.",
  "Make city-based browsing practical for people who are new to the area or helping someone else search.",
  "Present church details in a format that is easier to read, more complete, and more accessible."
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="About"
        title="A local church directory designed to be useful, welcoming, and trustworthy"
        description="The Champaign County Church Directory helps residents, visitors, students, and families discover churches with clearer service information, pastor details, and direct links to websites, apps, and livestreams."
      />
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {values.map((item) => (
          <Card key={item} className="rounded-[28px] bg-white/85 p-6">
            <p className="text-lg leading-8 text-stone-700">{item}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
