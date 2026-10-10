import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { ChurchTabs } from "@/components/dashboard/church-tabs";
import { Card } from "@/components/ui/card";
import { loadManagedChurch } from "@/lib/dashboard";
import { featureVisible } from "@/lib/plans";
import { profileChecklist } from "@/lib/services/completion";
import { ACTIVITY_METRICS, getActivitySummary } from "@/lib/services/engagement";

export default async function ChurchOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { church, canManage } = await loadManagedChurch(slug);
  const detailed = featureVisible("detailedInsights", church.enhancedProfile);
  const activity = await getActivitySummary(church.id, detailed ? 90 : 30);
  const items = profileChecklist(church);
  const done = items.filter((i) => i.done).length;
  const max = Math.max(1, ...activity.series.map((d) => d.views));

  return (
    <>
      <ChurchTabs slug={slug} current="" canManage={canManage} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="p-6">
          <h2 className="font-display text-2xl">Profile checklist</h2>
          <p className="mt-1 text-sm text-stone-600">{done} of {items.length} complete. Complete listings are easier for visitors to trust.</p>
          <ul className="mt-4 space-y-2">
            {items.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="flex min-h-[44px] items-center gap-3 rounded-xl px-2 text-sm hover:bg-brand-50 focus-ring">
                  {item.done ? <CheckCircle2 className="h-5 w-5 text-emerald-700" aria-hidden="true" /> : <Circle className="h-5 w-5 text-stone-400" aria-hidden="true" />}
                  <span className={item.done ? "text-stone-500 line-through" : "text-ink"}>{item.label}</span>
                  <span className="sr-only">{item.done ? "(done)" : "(to do)"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-2xl">Activity</h2>
          <p className="mt-1 text-sm text-stone-600">
            Counts of actions on this directory in the last {detailed ? 90 : 30} days. These are not visits to your church or attendance. No visitor is identified.
          </p>
          {activity.hasData ? (
            <>
              <p className="mt-4 font-display text-4xl">{activity.totals.profile_view}</p>
              <p className="text-sm text-stone-700">profile views</p>
              <div className="mt-4 flex h-24 items-end gap-[2px]" role="img" aria-label={`Daily profile views from ${activity.from} to ${activity.to}`}>
                {activity.series.map((d) => (
                  <div key={d.day} title={`${d.day}: ${d.views}`} className="flex-1 rounded-t bg-brand-500" style={{ height: `${(d.views / max) * 100}%`, minHeight: d.views ? 2 : 0 }} />
                ))}
              </div>
              {detailed ? (
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(ACTIVITY_METRICS)
                    .filter(([key]) => key !== "profile_view")
                    .map(([key, label]) => (
                      <div key={key} className="rounded-xl bg-brand-50 p-3">
                        <dt className="text-stone-600">{label}</dt>
                        <dd className="text-xl font-semibold text-ink">{activity.totals[key as keyof typeof activity.totals]}</dd>
                      </div>
                    ))}
                </dl>
              ) : (
                <p className="mt-4 text-sm text-stone-700">
                  The Enhanced Church Profile adds a 90-day breakdown of directions, website, phone, livestream, and share clicks.{" "}
                  {canManage ? <Link href={`/dashboard/churches/${slug}/billing`} className="font-semibold underline">See billing</Link> : null}
                </p>
              )}
            </>
          ) : (
            <p className="mt-4 rounded-2xl bg-brand-50 p-4 text-sm text-stone-700">No activity has been recorded yet. Counts start from the day this feature went live and are never estimated.</p>
          )}
        </Card>
      </div>
    </>
  );
}
