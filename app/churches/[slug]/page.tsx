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
import { getChurchBySlug, churches } from "@/lib/data/queries";
import { absoluteUrl } from "@/lib/utils";

export function generateStaticParams() {
  return churches.map((church) => ({ slug: church.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const church = getChurchBySlug(slug);
  if (!church) {
    return {};
  }

  return {
    title: `${church.name} | Champaign County Church Directory`,
    description: `${church.name} in ${church.city}, Illinois. View senior pastor, service times, website, app, social links, and directions.`,
    alternates: {
      canonical: absoluteUrl(`/churches/${church.slug}`)
    },
    openGraph: {
      title: church.name,
      description: church.shortDescription,
      url: absoluteUrl(`/churches/${church.slug}`),
      images: church.featuredImageUrl ? [{ url: church.featuredImageUrl }] : undefined
    }
  };
}

export default async function ChurchProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const church = getChurchBySlug(slug);

  if (!church) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Church",
    name: church.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: church.address1,
      addressLocality: church.city,
      addressRegion: church.state,
      postalCode: church.zip
    },
    telephone: church.phone,
    email: church.email,
    url: church.websiteUrl,
    image: church.featuredImageUrl,
    sameAs: church.socialLinks.map((link) => link.url)
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="overflow-hidden rounded-[36px] border border-white/70 bg-surface shadow-soft">
        <div className="relative h-80">
          <Image src={church.featuredImageUrl ?? church.logoUrl ?? "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1200&q=80"} alt={church.name} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-900/70 via-brand-700/20 to-transparent" />
        </div>
        <div className="grid gap-10 p-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <ChurchProfileHeader church={church} />
            <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-600">{church.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {church.websiteUrl ? (
                <Button asChild>
                  <Link href={church.websiteUrl} target="_blank" rel="noreferrer">
                    <Globe className="mr-2 h-4 w-4" />
                    Visit Website
                  </Link>
                </Button>
              ) : null}
              {church.appUrl ? (
                <Button asChild variant="secondary">
                  <Link href={church.appUrl} target="_blank" rel="noreferrer">
                    <Smartphone className="mr-2 h-4 w-4" />
                    Open App
                  </Link>
                </Button>
              ) : null}
              {church.livestreamUrl ? (
                <Button asChild variant="secondary">
                  <Link href={church.livestreamUrl} target="_blank" rel="noreferrer">
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Watch Livestream
                  </Link>
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
            <h2 className="font-display text-2xl">Church Details</h2>
            <div className="mt-6 space-y-4 text-sm text-stone-700">
              <p><span className="font-semibold text-ink">Denomination:</span> {church.denomination ?? "Not listed"}</p>
              <p><span className="font-semibold text-ink">Address:</span> {church.address1}, {church.city}, {church.state} {church.zip}</p>
              {church.phone ? <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-brand-700" /> {church.phone}</p> : null}
              {church.email ? <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand-700" /> {church.email}</p> : null}
            </div>
            <div className="mt-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Follow on Social</p>
              <div className="mt-3">
                <SocialIcons links={church.socialLinks} />
              </div>
            </div>
            <div className="mt-6 rounded-2xl bg-brand-50 p-4 text-sm leading-6 text-stone-700">
              Pastors and delegated staff can {church.claimed ? "request staff access to this listing" : "claim this listing"} after a verification step that reasonably proves they are authorized to manage it.
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <Card className="border-white/70 bg-gradient-to-br from-white to-brand-50 p-8">
          <h2 className="font-display text-3xl">Worship, study, and ministry times</h2>
          <div className="mt-6">
            <ServiceTimesList items={church.serviceTimes} />
          </div>
          <div className="mt-8">
            <h3 className="font-display text-2xl">Ministries Offered</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {church.ministries.map((item) => (
                <span key={item} className="rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-900">
                  {item}
                </span>
              ))}
            </div>
          </div>
          {church.leadership?.length ? (
            <div className="mt-8">
              <h3 className="font-display text-2xl">Leadership</h3>
              <div className="mt-4 space-y-3">
                {church.leadership.map((leader) => (
                  <p key={leader.fullName} className="text-sm text-stone-700">
                    <span className="font-semibold text-ink">{leader.fullName}</span> • {leader.title}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        <MapSection query={`${church.address1}, ${church.city}, ${church.state} ${church.zip}`} />
      </div>
    </div>
  );
}
