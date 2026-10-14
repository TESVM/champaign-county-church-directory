import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChurchCard } from "@/components/directory/church-card";
import { SectionHeading } from "@/components/layout/section-heading";
import { breadcrumbs, churchItemList, JsonLd } from "@/components/seo/json-ld";
import { familyBySlug, MIN_FAMILY_SIZE } from "@/lib/denominations";
import { listDenominationFamilies } from "@/lib/services/churches";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const family = familyBySlug(slug);
  if (!family) return null;
  const group = (await listDenominationFamilies()).find((g) => g.family.slug === slug);
  return group && group.churches.length >= MIN_FAMILY_SIZE ? group : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const group = await load((await params).slug);
  if (!group) return { title: "Not found", robots: { index: false } };
  const cities = [...new Set(group.churches.map((c) => c.city))].sort();
  return {
    title: `${group.family.name} Churches in Champaign County, IL`,
    description: `${group.churches.length} ${group.family.name} churches in ${cities.slice(0, 4).join(", ")}${cities.length > 4 ? " and nearby" : ""}, Illinois, with service times, pastors, addresses, and directions.`,
    alternates: { canonical: `/denominations/${group.family.slug}` }
  };
}

export default async function DenominationPage({ params }: Props) {
  const group = await load((await params).slug);
  if (!group) notFound();
  const { family, churches } = group;
  const byCity = new Map<string, typeof churches>();
  for (const c of churches) byCity.set(c.city, [...(byCity.get(c.city) ?? []), c]);
  const cities = [...byCity.keys()].sort((a, b) => (byCity.get(b)!.length - byCity.get(a)!.length) || a.localeCompare(b));
  const title = `${family.name} churches in Champaign County, Illinois`;

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={breadcrumbs([{ name: "Home", path: "/" }, { name: "Denominations", path: "/denominations" }, { name: `${family.name} churches`, path: `/denominations/${family.slug}` }])} />
      <JsonLd data={churchItemList(title, churches)} />
      <div className="section-strong overflow-hidden rounded-[36px] border border-white/70 px-6 py-8 shadow-soft sm:px-8">
        <SectionHeading
          as="h1"
          eyebrow={`${churches.length} churches`}
          title={title}
          description={`${family.blurb} Listed in ${cities.join(", ")}. Each listing shows service times, the pastor, directions, and when its details were last checked.`}
        />
      </div>
      {cities.map((city) => (
        <section key={city} className="space-y-5">
          <h2 className="font-display text-3xl text-ink">
            {family.name} churches in {city}
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {byCity.get(city)!.map((church) => (
              <ChurchCard key={church.id} church={church} />
            ))}
          </div>
        </section>
      ))}
      <p className="text-sm text-stone-600">
        <Link href="/denominations" className="underline">
          Other denominations
        </Link>{" "}
        · <Link href="/map" className="underline">See them on the map</Link> · <Link href="/find-a-service" className="underline">Find a service time</Link>
      </p>
    </div>
  );
}
