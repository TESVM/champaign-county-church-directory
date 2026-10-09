import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * Production allows indexing of public pages only. Any other environment
 * (preview deploys, local production builds) disallows everything so test
 * copies never compete with the real site in search results.
 */
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const isLive = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : process.env.ALLOW_INDEXING === "true";
  if (!isLive) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/api/", "/login", "/auth/", "/saved"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl()
  };
}
