import type { MetadataRoute } from "next";
import { churches, countyCities } from "@/lib/data/mock";
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
    "/search"
  ].map((path) => ({
    url: absoluteUrl(path),
    lastModified: new Date()
  }));

  const cityRoutes = countyCities.map((city) => ({
    url: absoluteUrl(`/cities/${city.slug}`),
    lastModified: new Date()
  }));

  const churchRoutes = churches.map((church) => ({
    url: absoluteUrl(`/churches/${church.slug}`),
    lastModified: new Date(church.lastUpdatedAt)
  }));

  return [...routes, ...cityRoutes, ...churchRoutes];
}
