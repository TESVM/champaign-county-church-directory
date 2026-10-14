import { siteUrl } from "@/lib/site";

/** Structured data for search engines. Content is server-generated, never user HTML. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Escape "<" so a church name can never close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** BreadcrumbList for Google's breadcrumb trail in results. Paths are site-relative. */
export function breadcrumbs(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: `${siteUrl()}${item.path}` }))
  };
}

/** ItemList of church profile pages, for city and denomination pages. */
export function churchItemList(name: string, churches: Array<{ slug: string; name: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: churches.length,
    itemListElement: churches.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: `${siteUrl()}/churches/${c.slug}`, name: c.name }))
  };
}
