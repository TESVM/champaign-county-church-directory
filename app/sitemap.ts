import type { MetadataRoute } from "next";
import { getPublishedChurches, getPublishedCities } from "@/lib/data/published";
import { absoluteUrl } from "@/lib/utils";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/about",
    "/contact",
    "/directory",
    "/cities",
    "/submit",
    "/claim",
    "/search",
    "/privacy"
  ].map((path) => ({
    url: absoluteUrl(path),
    lastModified: new Date()
  }));

  const cityRoutes = getPublishedCities().map((city) => ({
    url: absoluteUrl(`/cities/${city.slug}`),
    lastModified: new Date()
  }));

  const churchRoutes = getPublishedChurches().map((church) => ({
    url: absoluteUrl(`/churches/${church.slug}`),
    lastModified: new Date(church.lastUpdatedAt)
  }));

  return [...routes, ...cityRoutes, ...churchRoutes];
}
