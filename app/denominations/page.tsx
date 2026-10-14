import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/layout/section-heading";
import { breadcrumbs, JsonLd } from "@/components/seo/json-ld";
import { MIN_FAMILY_SIZE } from "@/lib/denominations";
import { listDenominationFamilies } from "@/lib/services/churches";

export const metadata: Metadata = {
  title: "Churches by Denomination in Champaign County, IL",
  description: "Browse Baptist, Methodist, Pentecostal, nondenominational, Lutheran, Presbyterian, and other churches in Champaign, Urbana, and across Champaign County, Illinois.",
  alternates: { canonical: "/denominations" }
};

export default async function DenominationsPage() {
  const groups = (await listDenominationFamilies()).filter((g) => g.churches.length >= MIN_FAMILY_SIZE);
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={breadcrumbs([{ name: "Home", path: "/" }, { name: "Denominations", path: "/denominations" }])} />
      <SectionHeading as="h1" eyebrow="Browse" title="Churches by denomination" description="Churches across Champaign County grouped by tradition. Each church’s own description of its denomination is shown on its listing." />
      <ul className="grid gap-4 sm:grid-cols-2">
        {groups.map(({ family, churches }) => (
          <li key={family.slug}>
            <Link href={`/denominations/${family.slug}`} className="focus-ring block rounded-[24px] border border-line bg-white p-5 shadow-card hover:border-brand-500">
              <p className="font-display text-xl text-ink">{family.name} churches</p>
              <p className="mt-1 text-sm text-stone-600">
                {churches.length} in Champaign County · {[...new Set(churches.map((c) => c.city))].sort().join(", ")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-stone-600">
        Looking for something else? Search the full <Link href="/directory" className="underline">directory</Link> or browse by <Link href="/cities" className="underline">city</Link>.
      </p>
    </div>
  );
}
