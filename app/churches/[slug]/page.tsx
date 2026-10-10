import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  Accessibility,
  Baby,
  CalendarDays,
  Car,
  Clock3,
  DoorOpen,
  Globe,
  HandHeart,
  Languages,
  Mail,
  MapPinned,
  Phone,
  PlayCircle,
  Shirt,
  Smartphone,
  Timer
} from "lucide-react";
import { ChurchPhotoPlaceholder } from "@/components/directory/church-card";
import { MapSection } from "@/components/directory/map-section";
import { PastorBadge } from "@/components/directory/pastor-badge";
import { ProfileViewBeacon, ShareButton } from "@/components/directory/profile-client";
import { SaveChurchButton } from "@/components/directory/save-church-button";
import { SocialIcons } from "@/components/directory/social-icons";
import { TrackedLink } from "@/components/directory/tracked-link";
import { VerifiedBadge } from "@/components/directory/verified-badge";
import { CorrectionForm } from "@/components/forms/correction-form";
import { Card } from "@/components/ui/card";
import { shouldOptimizeImage } from "@/lib/images";
import { featureVisible } from "@/lib/plans";
import { getChurchBySlug, getMergeTarget, verificationStatus } from "@/lib/services/churches";
import { RESOURCE_CATEGORIES, listResources, listUpcomingEvents } from "@/lib/services/engagement";
import { siteUrl } from "@/lib/site";
import { formatChicago } from "@/lib/time/chicago";
import { externalUrl, formatDate } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getChurchBySlug(slug);
  if (!result) return {};
  const { church } = result;
  const description =
    church.shortDescription || `${church.name} in ${church.city}, Illinois: service times, address, and how to plan a first visit.`;
  return {
    title: `${church.name} — ${church.city}, IL`,
    description,
    alternates: { canonical: `/churches/${church.slug}` },
    robots: church.status === "ACTIVE" ? undefined : { index: false },
    openGraph: { title: church.name, description, url: `/churches/${church.slug}`, type: "website" },
    twitter: { card: "summary_large_image", title: church.name, description }
  };
}

/** JSON.stringify does not escape `<`; church-edited text must not break out of the script tag. */
function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function GuideItem({ icon: Icon, title, children }: { icon: typeof Car; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-brand-50/70 p-4">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <div className="mt-1 whitespace-pre-line text-sm leading-6 text-stone-700">{children}</div>
      </div>
    </div>
  );
}

function yesNo(value: boolean | null | undefined, yes: string, no?: string) {
  if (value === true) return yes;
  if (value === false) return no ?? null;
  return null;
}

const pill = "inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink hover:border-brand-700 focus-ring";

export default async function ChurchProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getChurchBySlug(slug);
  if (!result) notFound();
  const { church, row } = result;

  if (church.status === "MERGED") {
    const target = await getMergeTarget(row.mergedIntoId);
    if (target) permanentRedirect(`/churches/${target.slug}`);
    notFound();
  }

  const enhanced = Boolean(church.enhancedProfile);
  const show = (feature: Parameters<typeof featureVisible>[0]) => featureVisible(feature, enhanced);
  const [events, resources] = await Promise.all([
    show("events") ? listUpcomingEvents({ churchId: church.id, days: 120 }) : Promise.resolve([]),
    listResources({ churchId: church.id })
  ]);

  const profileUrl = `${siteUrl()}/churches/${church.slug}`;
  const websiteUrl = externalUrl(church.websiteUrl);
  const livestreamUrl = show("livestream") ? externalUrl(church.livestreamUrl) : null;
  const appStoreUrl = show("appLinks") ? externalUrl(church.appStoreUrl) : null;
  const googlePlayUrl = show("appLinks") ? externalUrl(church.googlePlayUrl) : null;
  const otherAppUrl = show("appLinks") && !appStoreUrl && !googlePlayUrl ? externalUrl(church.appUrl) : null;
  const addressLine = [church.address1, church.address2, church.city, `${church.state} ${church.zip}`.trim()].filter(Boolean).join(", ");
  const directionsUrl = church.address1
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${church.name}, ${addressLine}`)}`
    : null;
  const verification = verificationStatus(church);
  const guide = church.visitorGuide;
  const image = church.featuredImageUrl;
  const closed = church.status === "CLOSED";
  const telHref = church.phone ? `tel:${church.phone.replace(/[^\d+]/g, "")}` : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Church",
    name: church.name,
    url: profileUrl,
    ...(church.address1
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: church.address1,
            addressLocality: church.city,
            addressRegion: church.state,
            postalCode: church.zip || undefined,
            addressCountry: "US"
          }
        }
      : {}),
    ...(church.latitude != null && church.longitude != null
      ? { geo: { "@type": "GeoCoordinates", latitude: church.latitude, longitude: church.longitude } }
      : {}),
    telephone: church.phone,
    email: church.email,
    image: image ? (image.startsWith("http") ? image : `${siteUrl()}${image}`) : undefined,
    sameAs: [websiteUrl, ...(show("socialLinks") ? church.socialLinks.map((l) => l.url) : [])].filter(Boolean)
  };

  let verificationText: React.ReactNode;
  if (verification.level === "leadership") {
    verificationText = `Details confirmed by church leadership on ${formatDate(verification.date)}.`;
  } else if (verification.level === "public-source") {
    verificationText = (
      <>
        Details checked against{" "}
        {verification.sourceUrl ? (
          <a href={verification.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">
            a public source
          </a>
        ) : (
          "a public source"
        )}{" "}
        on {formatDate(verification.date)}; not yet confirmed by the church.
      </>
    );
  } else {
    verificationText = "These details come from public listings and have not been checked yet. Please confirm with the church.";
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      {!closed ? <ProfileViewBeacon slug={church.slug} /> : null}

      {closed ? (
        <div role="status" className="mb-6 rounded-[24px] border border-amber-300 bg-amber-50 p-5 text-amber-950">
          <p className="font-semibold">This church is listed as closed.</p>
          {church.statusNote ? <p className="mt-1 text-sm">{church.statusNote}</p> : null}
          <p className="mt-1 text-sm">
            If that is wrong,{" "}
            <a href="#report" className="underline">
              let us know
            </a>
            .
          </p>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">{church.city}, Illinois</p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">{church.name}</h1>
          <div className="mt-4">
            <VerifiedBadge
              verified={church.verified}
              claimed={church.claimed}
              leadershipConfirmedAt={church.leadershipConfirmedAt}
              publicSourceCheckedAt={church.publicSourceCheckedAt}
            />
          </div>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {verificationText} Last updated {formatDate(church.lastUpdatedAt)}.
          </p>
          {church.denomination ? (
            <p className="mt-4 inline-flex rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-900">{church.denomination}</p>
          ) : null}
          <div className="mt-5">
            <PastorBadge name={church.pastor.fullName} title={church.pastor.title} photoUrl={church.pastor.photoUrl} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {directionsUrl ? (
              <TrackedLink
                churchSlug={church.slug}
                metric="directions_click"
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-700 focus-ring"
              >
                <MapPinned className="h-4 w-4" aria-hidden="true" /> Directions
              </TrackedLink>
            ) : null}
            {telHref ? (
              <TrackedLink churchSlug={church.slug} metric="phone_click" href={telHref} className={pill}>
                <Phone className="h-4 w-4" aria-hidden="true" /> Call
              </TrackedLink>
            ) : null}
            {websiteUrl ? (
              <TrackedLink churchSlug={church.slug} metric="website_click" href={websiteUrl} target="_blank" rel="noopener noreferrer" className={pill}>
                <Globe className="h-4 w-4" aria-hidden="true" /> Website
              </TrackedLink>
            ) : null}
            {livestreamUrl ? (
              <TrackedLink churchSlug={church.slug} metric="livestream_click" href={livestreamUrl} target="_blank" rel="noopener noreferrer" className={pill}>
                <PlayCircle className="h-4 w-4" aria-hidden="true" /> Watch online
              </TrackedLink>
            ) : null}
            <SaveChurchButton slug={church.slug} name={church.name} />
            <ShareButton slug={church.slug} url={profileUrl} name={church.name} />
          </div>
        </div>

        <figure className="relative min-h-[280px] overflow-hidden rounded-[32px] border border-line shadow-soft">
          {image ? (
            <Image
              src={image}
              alt={church.name}
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
              unoptimized={!shouldOptimizeImage(image)}
            />
          ) : (
            <ChurchPhotoPlaceholder citySlug={church.citySlug} className="min-h-[280px]" />
          )}
          {image && church.featuredImageCredit ? (
            <figcaption className="absolute bottom-0 left-0 right-0 bg-black/60 px-4 py-2 text-xs text-white">Photo: {church.featuredImageCredit}</figcaption>
          ) : null}
        </figure>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <Card className="p-6 sm:p-8">
            <h2 className="font-display text-3xl">Service times</h2>
            {church.serviceDetails?.length ? (
              <ul className="mt-5 space-y-3">
                {church.serviceDetails.map((service) => (
                  <li key={service.id} className="flex gap-3 rounded-2xl bg-brand-50 px-4 py-3">
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-ink">{service.serviceName}</p>
                      <p className="text-sm text-stone-700">
                        {service.dayOfWeek} at {service.startTime}
                        {service.endTime ? ` – ${service.endTime}` : ""}
                        {service.language ? ` · ${service.language}` : ""}
                      </p>
                      {service.notes ? <p className="text-sm text-stone-600">{service.notes}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-stone-700">
                Service times have not been listed yet. Please contact the church before visiting.
              </p>
            )}
          </Card>

          <Card className="p-6 sm:p-8" id="plan-your-visit">
            <h2 className="font-display text-3xl">Plan your first visit</h2>
            {guide ? (
              <>
                <p className="mt-2 text-sm text-stone-600">Shared by the church · updated {formatDate(guide.updatedAt)}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {guide.whatToExpect ? (
                    <div className="sm:col-span-2">
                      <GuideItem icon={HandHeart} title="What to expect">{guide.whatToExpect}</GuideItem>
                    </div>
                  ) : null}
                  {guide.parking ? <GuideItem icon={Car} title="Parking">{guide.parking}</GuideItem> : null}
                  {guide.entrance ? <GuideItem icon={DoorOpen} title="Which entrance">{guide.entrance}</GuideItem> : null}
                  {guide.accessibility || guide.wheelchairAccessible != null || guide.hearingAssistance ? (
                    <GuideItem icon={Accessibility} title="Accessibility">
                      {[
                        yesNo(guide.wheelchairAccessible, "Wheelchair accessible.", "Not wheelchair accessible."),
                        yesNo(guide.hearingAssistance, "Hearing assistance available."),
                        guide.accessibility
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </GuideItem>
                  ) : null}
                  {guide.childrenCheckIn || guide.hasChildrenProgram != null ? (
                    <GuideItem icon={Baby} title="Children">
                      {[yesNo(guide.hasChildrenProgram, "Children’s program offered.", "No separate children’s program."), guide.childrenCheckIn]
                        .filter(Boolean)
                        .join(" ")}
                    </GuideItem>
                  ) : null}
                  {guide.serviceLength ? <GuideItem icon={Timer} title="Typical service length">{guide.serviceLength}</GuideItem> : null}
                  {guide.dress ? <GuideItem icon={Shirt} title="What people wear">{guide.dress}</GuideItem> : null}
                  {guide.languages.length ? <GuideItem icon={Languages} title="Languages">{guide.languages.join(", ")}</GuideItem> : null}
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm leading-6 text-stone-700">
                This church has not added visitor details yet.{" "}
                {church.phone
                  ? `Call ${church.phone} to ask about parking, accessibility, and children’s programs.`
                  : "Contact the church to ask about parking, accessibility, and children’s programs."}
              </p>
            )}
          </Card>

          {church.description || (show("ministries") && church.ministries.length) || (show("leadershipTeam") && church.leadership?.length) ? (
            <Card className="p-6 sm:p-8">
              <h2 className="font-display text-3xl">About</h2>
              {church.description ? <p className="mt-4 whitespace-pre-line leading-8 text-stone-700">{church.description}</p> : null}
              {show("ministries") && church.ministries.length ? (
                <div className="mt-6">
                  <h3 className="font-display text-2xl">Ministries</h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {church.ministries.map((m) => (
                      <li key={m} className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-900">
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {show("leadershipTeam") && church.leadership?.length ? (
                <div className="mt-6">
                  <h3 className="font-display text-2xl">Leadership</h3>
                  <ul className="mt-3 space-y-2">
                    {church.leadership.map((l) => (
                      <li key={l.fullName} className="text-sm text-stone-700">
                        <span className="font-semibold text-ink">{l.fullName}</span>
                        {l.title ? ` — ${l.title}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Card>
          ) : null}

          {events.length ? (
            <Card className="p-6 sm:p-8">
              <h2 className="font-display text-3xl">Upcoming events</h2>
              <ul className="mt-5 space-y-3">
                {events.slice(0, 8).map((event) => (
                  <li key={`${event.eventId}-${event.date}`} className="rounded-2xl border border-line p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-brand-900">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      {formatChicago(event.startsAt, { weekday: "long", month: "long", day: "numeric" })}
                      {event.startTime ? ` · ${formatChicago(event.startsAt, { hour: "numeric", minute: "2-digit" })}` : " · all day"}
                    </p>
                    <p className="mt-1 font-semibold text-ink">{event.title}</p>
                    {event.location ? <p className="text-sm text-stone-600">{event.location}</p> : null}
                    <p className="mt-2 flex flex-wrap gap-4 text-sm">
                      <a href={`/api/events/${event.eventId}/ics`} className="font-semibold text-brand-900 underline-offset-4 hover:underline">
                        Add to calendar
                      </a>
                      {event.registrationUrl ? (
                        <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-brand-900 underline-offset-4 hover:underline">
                          Register
                        </a>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {resources.length ? (
            <Card className="p-6 sm:p-8">
              <h2 className="font-display text-3xl">Community help</h2>
              <ul className="mt-5 space-y-3">
                {resources.map((r) => (
                  <li key={r.id} className="rounded-2xl border border-line p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
                      {RESOURCE_CATEGORIES.find((c) => c.value === r.category)?.label}
                    </p>
                    <p className="mt-1 font-semibold text-ink">{r.title}</p>
                    <p className="mt-1 text-sm leading-6 text-stone-700">{r.description}</p>
                    {r.schedule ? (
                      <p className="mt-1 text-sm text-stone-600">
                        <span className="font-semibold">When:</span> {r.schedule}
                      </p>
                    ) : null}
                    {r.eligibility ? (
                      <p className="text-sm text-stone-600">
                        <span className="font-semibold">Who can use it:</span> {r.eligibility}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="space-y-8">
          <Card className="p-6 sm:p-8">
            <h2 className="font-display text-3xl">Contact</h2>
            <dl className="mt-4 space-y-3 text-sm text-stone-700">
              {addressLine ? (
                <div>
                  <dt className="font-semibold text-ink">Address</dt>
                  <dd>{addressLine}</dd>
                </div>
              ) : null}
              {church.phone && telHref ? (
                <div>
                  <dt className="font-semibold text-ink">Phone</dt>
                  <dd>
                    <TrackedLink churchSlug={church.slug} metric="phone_click" href={telHref} className="underline">
                      {church.phone}
                    </TrackedLink>
                  </dd>
                </div>
              ) : null}
              {church.email ? (
                <div>
                  <dt className="font-semibold text-ink">Email</dt>
                  <dd>
                    <TrackedLink churchSlug={church.slug} metric="email_click" href={`mailto:${church.email}`} className="inline-flex items-center gap-1 break-all underline">
                      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {church.email}
                    </TrackedLink>
                  </dd>
                </div>
              ) : null}
            </dl>
            {appStoreUrl || googlePlayUrl || otherAppUrl ? (
              <div className="mt-5 flex flex-wrap gap-3">
                {appStoreUrl ? (
                  <TrackedLink churchSlug={church.slug} metric="app_click" href={appStoreUrl} target="_blank" rel="noopener noreferrer" className={pill}>
                    <Smartphone className="h-4 w-4" aria-hidden="true" />
                    Apple App Store
                  </TrackedLink>
                ) : null}
                {googlePlayUrl ? (
                  <TrackedLink churchSlug={church.slug} metric="app_click" href={googlePlayUrl} target="_blank" rel="noopener noreferrer" className={pill}>
                    <Smartphone className="h-4 w-4" aria-hidden="true" />
                    Google Play
                  </TrackedLink>
                ) : null}
                {otherAppUrl ? (
                  <TrackedLink churchSlug={church.slug} metric="app_click" href={otherAppUrl} target="_blank" rel="noopener noreferrer" className={pill}>
                    <Smartphone className="h-4 w-4" aria-hidden="true" />
                    Church app
                  </TrackedLink>
                ) : null}
              </div>
            ) : null}
            {show("socialLinks") && church.socialLinks.length ? (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-ink">Follow</h3>
                <div className="mt-2">
                  <SocialIcons links={church.socialLinks} churchName={church.name} />
                </div>
              </div>
            ) : null}
          </Card>

          {show("map") && addressLine ? <MapSection query={`${church.name}, ${addressLine}`} churchName={church.name} /> : null}

          {!church.claimed ? (
            <Card className="border-brand-100 bg-brand-50/60 p-6">
              <h2 className="font-display text-2xl">Part of this church’s leadership?</h2>
              <p className="mt-2 text-sm leading-6 text-stone-700">
                Request access to keep this listing current, add visitor information, and see how many people view it. The basic listing is free.
              </p>
              <Link href={`/claim?church=${church.slug}`} className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-700 focus-ring">
                Manage this listing
              </Link>
            </Card>
          ) : null}

          <Card className="p-6" id="report">
            <details>
              <summary className="cursor-pointer font-display text-2xl focus-ring">Report outdated information</summary>
              <p className="mt-2 text-sm text-stone-600">
                No account needed. Reports go to the directory team{church.claimed ? " and the church’s listing managers" : ""}.
              </p>
              <div className="mt-4">
                <CorrectionForm churchSlug={church.slug} churchName={church.name} />
              </div>
            </details>
          </Card>
        </div>
      </div>
    </div>
  );
}
