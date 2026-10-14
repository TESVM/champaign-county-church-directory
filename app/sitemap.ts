import type { MetadataRoute } from "next";
import { listOrganizations } from "@/lib/services/campus";
import { MIN_FAMILY_SIZE } from "@/lib/denominations";
import { listAllChurchSlugs, listCities, listDenominationFamilies } from "@/lib/services/churches";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const staticPaths = ["/", "/directory", "/map", "/denominations", "/live", "/collaborate", "/campus", "/campus/uiuc", "/campus/parkland", "/campus/other-students", "/campus/organizations", "/campus/churches", "/campus/events", "/campus/new-to-champaign-urbana", "/campus/list-your-organization", "/find-a-service", "/events", "/resources", "/cities", "/for-churches", "/about", "/submit", "/claim", "/contact", "/privacy", "/terms", "/accessibility"];
  try {
    const [churches, cities, orgs, families] = await Promise.all([listAllChurchSlugs(), listCities(), listOrganizations(), listDenominationFamilies()]);
    return [
      ...staticPaths.map((path) => ({ url: `${base}${path}`, changeFrequency: "weekly" as const })),
      ...cities.map((city) => ({ url: `${base}/cities/${city.slug}`, changeFrequency: "weekly" as const })),
      ...families.filter((g) => g.churches.length >= MIN_FAMILY_SIZE).map((g) => ({ url: `${base}/denominations/${g.family.slug}`, changeFrequency: "weekly" as const })),
      ...orgs.map((o) => ({ url: `${base}/campus/organizations/${o.slug}`, lastModified: o.updatedAt, changeFrequency: "monthly" as const })),
      ...churches
        .filter((c) => c.status === "ACTIVE")
        .map((c) => ({ url: `${base}/churches/${c.slug}`, lastModified: c.lastUpdatedAt ?? c.updatedAt, changeFrequency: "monthly" as const }))
    ];
  } catch {
    // A sitemap without church URLs is better than a 500 for crawlers.
    return staticPaths.map((path) => ({ url: `${base}${path}` }));
  }
}
