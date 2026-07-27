import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe, Mail, Phone, PlayCircle, Smartphone } from "lucide-react";
import { MapSection } from "@/components/directory/map-section";
import { ChurchProfileHeader } from "@/components/directory/church-profile-header";
import { ServiceTimesList } from "@/components/directory/service-times-list";
import { SocialIcons } from "@/components/directory/social-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchChurchBySlug } from "@/lib/data/source";
import { getPublishedChurches } from "@/lib/data/published";
import { absoluteUrl, externalUrl, isInlineImageUrl } from "@/lib/utils";

/**
 * Reads through `lib/data/source.ts`, so an admin or church edit saved to
 * Postgres is visible here. Previously this page read the in-repo records
 * directly, and a saved change never appeared however many times it was saved.
 */

// Short, because an edit should reach the public page quickly. `revalidatePath`
// in the save actions still invalidates immediately; this is the backstop.
export const revalidate = 300;

const FALLBACK_HERO =
  "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1200&q=80";

export function generateStaticParams() {
  // Pre-render the known set; anything added to the database later renders on
  // demand.
  return getPublishedChurches().map((church) => ({ slug: church.slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const church = await fetchChurchBySlug(slug);

  if (!church) return {};

  const image = church.media.featuredImageUrl ?? church.media.logoUrl;
  const metadataImage = isInlineImageUrl(image) ? undefined : image;

  return {
    title: `${church.name} | Champaign County Church Directory`,
    description: `${church.name} in ${church.city.name}, Illinois. View pastor, service times, website, app, social links, and directions.`,
    alternates: { canonical: absoluteUrl(`/churches/${church.slug}`) },
    openGraph: {
      title: church.name,
      description: church.shortDescription ?? undefined,
      url: absoluteUrl(`/churches/${church.slug}`),
      images: metadataImage ? [{ url: metadataImage }] : undefined
    }
  };
}

/**
 * JSON.stringify does not escape `<`, so a church name or description
 * containing `</script>` would break out of this block and inject markup. These
 * fields are editable by admins and church staff, which makes this a live
 * stored-XSS path rather than a theoretical one.
 */
function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export default async function ChurchProfilePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const church = await fetchChurchBySlug(slug);

  if (!church) {
    notFound();
  }

  const websiteUrl = externalUrl(church.contact.websiteUrl);
  const appUrl = externalUrl(church.contact.appUrl);
  const livestreamUrl = externalUrl(church.contact.livestreamUrl);

  const heroImage =
    church.media.featuredImageUrl ?? church.media.logoUrl ?? FALLBACK_HERO;
  const unoptimizedHero = isInlineImageUrl(heroImage);

  const addressLine = [
    church.address.line1,
    church.address.city,
    `${church.address.state} ${church.address.zip ?? ""}`.trim()
  ]
    .filter(Boolean)
    .join(", ");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Church",
    name: church.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: church.address.line1,
      addressLocality: church.address.city,
      addressRegion: church.address.state,
      postalCode: church.address.zip
    },
    ...(church.address.latitude !== null && church.address.longitude !== null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: church.address.latitude,
            longitude: church.address.longitude
          }
        }
      : {}),
    telephone: church.contact.phone,
    email: church.contact.email,
    url: church.contact.websiteUrl,
    image: isInlineImageUrl(heroImage) ? undefined : heroImage,
    sameAs: church.socialLinks.map((link) => link.url)
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <div className="overflow-hidden rounded-[36px] border border-white/70 bg-surface shadow-soft">
        <div className="relative h-64 sm:h-80">
          <Image
            src={heroImage}
            alt={`${church.name} building or logo`}
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover"
            unoptimized={unoptimizedHero}
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-900/70 via-brand-700/20 to-transparent" />
        </div>
        <div className="grid gap-10 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <ChurchProfileHeader church={church} />
            {church.description ? (
              <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-700">
                {church.description}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              {websiteUrl ? (
                <Button asChild>
                  <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                    <Globe className="mr-2 h-4 w-4" aria-hidden="true" />
                    Visit website
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </Button>
              ) : null}
              {appUrl ? (
                <Button asChild variant="secondary">
                  <a href={appUrl} target="_blank" rel="noopener noreferrer">
                    <Smartphone className="mr-2 h-4 w-4" aria-hidden="true" />
                    Open app
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </Button>
              ) : null}
              {livestreamUrl ? (
                <Button asChild variant="secondary">
                  <a href={livestreamUrl} target="_blank" rel="noopener noreferrer">
                    <PlayCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                    Watch livestream
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </Button>
              ) : null}
              <Button asChild variant="secondary">
                <Link href={`/claim?church=${church.slug}`}>
                  {church.claimed ? "Request staff access" : "Claim this church"}
                </Link>
              </Button>
            </div>
          </div>

          <Card className="border-white/60 bg-gradient-to-br from-white to-brand-50 p-6">
            <h2 className="font-display text-2xl">Church details</h2>
            <div className="mt-6 space-y-4 text-sm text-stone-700">
              <p>
                <span className="font-semibold text-ink">Denomination:</span>{" "}
                {church.denomination ?? "Not listed"}
              </p>
              {addressLine ? (
                <p>
                  <span className="font-semibold text-ink">Address:</span> {addressLine}
                </p>
              ) : null}
              {church.contact.phone ? (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  <a
                    className="underline underline-offset-2"
                    href={`tel:${church.contact.phone.replace(/[^0-9+]/g, "")}`}
                  >
                    {church.contact.phone}
                  </a>
                </p>
              ) : null}
              {church.contact.email ? (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  <a
                    className="underline underline-offset-2"
                    href={`mailto:${church.contact.email}`}
                  >
                    {church.contact.email}
                  </a>
                </p>
              ) : null}
            </div>
            {church.socialLinks.length > 0 ? (
              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
                  Follow on social
                </h3>
                <div className="mt-3">
                  <SocialIcons links={church.socialLinks} churchName={church.name} />
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <Card className="border-white/70 bg-gradient-to-br from-white to-brand-50 p-6 sm:p-8">
          <h2 className="font-display text-2xl sm:text-3xl">
            Worship, study, and ministry times
          </h2>
          <div className="mt-6">
            <ServiceTimesList items={church.serviceTimes} />
          </div>
          {church.ministries.length > 0 ? (
            <div className="mt-8">
              <h3 className="font-display text-2xl">Ministries offered</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {church.ministries.map((ministry) => (
                  <span
                    key={ministry.id}
                    className="rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-900"
                  >
                    {ministry.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {church.leaders.length > 0 ? (
            <div className="mt-8">
              <h3 className="font-display text-2xl">Leadership</h3>
              <div className="mt-4 space-y-3">
                {church.leaders.map((leader) => (
                  <p key={leader.fullName} className="text-sm text-stone-700">
                    <span className="font-semibold text-ink">{leader.fullName}</span>
                    {leader.title ? ` • ${leader.title}` : ""}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        {addressLine ? <MapSection query={addressLine} churchName={church.name} /> : null}
      </div>
    </div>
  );
}
