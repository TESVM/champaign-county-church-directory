import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/layout/section-heading";

const values = [
  "Help residents and visitors compare churches without jumping across disconnected websites.",
  "Make city-based browsing practical for people who are new to the area or helping someone else search.",
  "Present church details in a format that is easier to read, more complete, and more accessible."
];

export const metadata: Metadata = {
  title: "About the Directory",
  description: "How the Champaign County Church Directory gathers, checks, and labels church information.",
  alternates: { canonical: "/about" }
};

const labels = [
  ["Confirmed by church", "Someone the directory verified as authorised by the church reviewed and saved the listing. The date shows when."],
  ["Source checked", "A directory reviewer compared the listing with the church’s own website or another public source on the date shown. The church itself has not confirmed it."],
  ["Not yet verified", "The details come from public listings and have not been checked. Please confirm with the church before visiting."],
  ["Church-managed", "Church staff have access to keep the listing current."]
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
          as="h1"
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
      <section aria-labelledby="labels" className="mt-12">
        <h2 id="labels" className="font-display text-3xl">What the listing labels mean</h2>
        <dl className="mt-6 grid gap-4 md:grid-cols-2">
          {labels.map(([term, detail]) => (
            <Card key={term} className="rounded-[24px] p-5">
              <dt className="font-semibold text-ink">{term}</dt>
              <dd className="mt-2 text-sm leading-6 text-stone-700">{detail}</dd>
            </Card>
          ))}
        </dl>
        <p className="mt-6 text-sm leading-6 text-stone-700">
          We never invent pastors, service times, contact details, or photographs. A listing without a photo shows a plain
          placeholder until the church provides a real one. Each week we automatically re-check churches’ own websites (never
          social media sign-in pages) and a reviewer approves any change before it appears. Activity counts shown to churches are
          counts of actions on this website, not attendance.
        </p>
      </section>
    </div>
  );
}
