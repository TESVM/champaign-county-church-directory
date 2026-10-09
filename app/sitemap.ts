import type { MetadataRoute } from "next";
import { listAllChurchSlugs, listCities } from "@/lib/services/churches";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const staticPaths = ["/", "/directory", "/find-a-service", "/events", "/resources", "/cities", "/for-churches", "/about", "/submit", "/claim", "/contact", "/privacy", "/terms"];
  try {
    const [churches, cities] = await Promise.all([listAllChurchSlugs(), listCities()]);
    return [
      ...staticPaths.map((path) => ({ url: `${base}${path}`, changeFrequency: "weekly" as const })),
      ...cities.map((city) => ({ url: `${base}/cities/${city.slug}`, changeFrequency: "weekly" as const })),
      ...churches
        .filter((c) => c.status === "ACTIVE")
        .map((c) => ({ url: `${base}/churches/${c.slug}`, lastModified: c.lastUpdatedAt ?? c.updatedAt, changeFrequency: "monthly" as const }))
    ];
  } catch {
    // A sitemap without church URLs is better than a 500 for crawlers.
    return staticPaths.map((path) => ({ url: `${base}${path}` }));
  }
}
