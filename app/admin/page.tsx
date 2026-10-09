import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth-guards";
import { env } from "@/lib/env";
import { adminOverview, adminQueueCounts } from "@/lib/services/admin-stats";
import { billingConfigured } from "@/lib/services/billing";
import { formatDate } from "@/lib/utils";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const actor = await requireStaff();
  const { denied } = await searchParams;
  const [counts, overview] = await Promise.all([adminQueueCounts(), adminOverview()]);
  const queues = [
    ["Claim requests", counts.claims, "/admin/claims"],
    ["New church submissions", counts.submissions, "/admin/submissions"],
    ["Messages and corrections", counts.inbox, "/admin/inbox"],
    ["Website review proposals", counts.changes, "/admin/review"],
    ["Community programs", counts.resources, "/admin/resources"]
  ] as const;
  const setup = [
    ["Email delivery", env.emailProvider === "resend" && Boolean(env.resendApiKey && env.emailFrom)],
    ["Staff notification address", Boolean(env.adminNotifyEmail)],
    ["Public support email", Boolean(env.supportEmail)],
    ["Stripe billing", billingConfigured()],
    ["Photo uploads (Blob)", env.mediaDriver === "blob" && Boolean(env.blobToken)],
    ["Weekly website review (CRON_SECRET)", Boolean(env.cronSecret)]
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-stone-600">Signed in as {actor.email} ({actor.staffRole?.toLowerCase()})</p>
        <h1 className="font-display text-4xl">Directory overview</h1>
      </div>
      {denied ? <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">That page needs a reviewer or administrator role.</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {queues.map(([label, count, href]) => (
          <Link key={href} href={href} className="rounded-[20px] border border-line bg-white p-4 shadow-card hover:border-brand-700 focus-ring">
            <p className="font-display text-3xl">{count}</p>
            <p className="text-sm text-stone-700">{label} waiting</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-2xl">Listings</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {[
              ["Active", overview.active],
              ["Closed", overview.closed],
              ["Hidden", overview.hidden],
              ["Checked against public source", overview.sourceChecked],
              ["Confirmed by church leadership", overview.leadership],
              ["Church-managed", overview.claimed],
              ["With a real photo", overview.withPhoto],
              ["Paid subscriptions", overview.enhancedSubs],
              ["Complimentary enhanced", overview.complimentary]
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-xl bg-brand-50 p-3">
                <dt className="text-stone-600">{label}</dt>
                <dd className="text-xl font-semibold">{value as number}</dd>
              </div>
            ))}
          </dl>
          <a href="/admin/export" className="mt-5 inline-flex min-h-[44px] items-center rounded-full bg-brand-900 px-5 text-sm font-semibold text-white focus-ring">
            Export contacts (CSV for Excel)
          </a>
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-2xl">Longest since last update</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {overview.stale.map((c) => (
              <li key={c.slug} className="flex justify-between gap-3">
                <Link href={`/admin/churches/${c.slug}`} className="underline-offset-4 hover:underline">{c.name}</Link>
                <span className="text-stone-600">{c.lastUpdatedAt ? formatDate(c.lastUpdatedAt.toISOString()) : "never"}</span>
              </li>
            ))}
          </ul>
          <h2 className="mt-6 font-display text-2xl">Configuration</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {setup.map(([label, ok]) => (
              <li key={label} className={ok ? "text-emerald-800" : "text-amber-900"}>{ok ? "✓" : "✗"} {label}{ok ? "" : " — not configured"}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-stone-600">Full status: /api/health</p>
        </Card>
      </div>
    </div>
  );
}
