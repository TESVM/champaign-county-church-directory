import { CopyField } from "@/components/directory/profile-client";
import { ChurchTabs } from "@/components/dashboard/church-tabs";
import { Card } from "@/components/ui/card";
import { loadManagedChurch } from "@/lib/dashboard";
import { siteUrl } from "@/lib/site";

export default async function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { church, canManage } = await loadManagedChurch(slug, "/share");
  const url = `${siteUrl()}/churches/${church.slug}`;
  const badge = `${siteUrl()}/brand/find-us-badge.png`;
  const badgeHtml = `<a href="${url}" title="${church.name} on Champaign County Churches"><img src="${badge}" alt="Find us on Champaign County Churches" width="200" height="85"></a>`;
  return (
    <>
      <ChurchTabs slug={slug} current="/share" canManage={canManage} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="p-6">
          <h2 className="font-display text-2xl">Share your listing</h2>
          <p className="mt-1 text-sm text-stone-600">Use this link in bulletins, emails, and social posts. Shared links show a preview card with your church name and service times.</p>
          <div className="mt-4">
            <CopyField value={url} label="Listing link" slug={church.slug} />
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-2xl">QR code</h2>
          <p className="mt-1 text-sm text-stone-600">Print on bulletins, signs, or welcome cards. It opens your listing.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/churches/${church.slug}/qr?format=svg`} alt={`QR code linking to ${url}`} width={220} height={220} className="mt-4 rounded-xl border border-line bg-white p-2" />
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={`/api/churches/${church.slug}/qr?download=1`} className="inline-flex min-h-[44px] items-center rounded-full bg-brand-900 px-5 text-sm font-semibold text-white focus-ring">Download PNG</a>
            <a href={`/api/churches/${church.slug}/qr?format=svg&download=1`} className="inline-flex min-h-[44px] items-center rounded-full border border-line px-5 text-sm font-semibold focus-ring">Download SVG (for print)</a>
          </div>
        </Card>
        <Card className="p-6 lg:col-span-2">
          <h2 className="font-display text-2xl">Add a badge to your website</h2>
          <p className="mt-1 text-sm text-stone-600">
            Paste this code into your church website (for example in the footer or on your “Visit” page). Visitors can see your service times and directions, and links from church websites help people find churches here when they search.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/find-us-badge.png" alt="Find us on Champaign County Churches" width={200} height={85} className="mt-4" />
          <div className="mt-4">
            <CopyField value={badgeHtml} label="Badge code" slug={church.slug} />
          </div>
          <p className="mt-2 text-xs text-stone-500">Using Wix, Squarespace, or WordPress? Add an “Embed code” or “Custom HTML” block and paste it there.</p>
        </Card>
      </div>
    </>
  );
}
