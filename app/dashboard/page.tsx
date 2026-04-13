import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/layout/section-heading";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Church Dashboard"
        title="Sample church owner dashboard"
        description="A simple owner view for managing a claimed church listing, profile freshness, and suggested updates."
      />
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {[
          ["Listing views", "1,284"],
          ["Pending updates", "4"],
          ["Profile completeness", "88%"]
        ].map(([label, value]) => (
          <Card key={label} className="rounded-[28px] bg-white/85 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">{label}</p>
            <p className="mt-4 font-display text-4xl text-ink">{value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card className="rounded-[32px] bg-white/85 p-6">
          <h2 className="font-display text-2xl text-ink">Needs attention</h2>
          <div className="mt-5 space-y-3 text-sm text-stone-700">
            <p>Update Easter and summer service schedules.</p>
            <p>Review one pending pastor title correction.</p>
            <p>Confirm app and livestream links are still current.</p>
          </div>
        </Card>
        <Card className="rounded-[32px] bg-white/85 p-6">
          <h2 className="font-display text-2xl text-ink">Recent activity</h2>
          <div className="mt-5 space-y-3 text-sm text-stone-700">
            <p>Claim request approved for church owner access.</p>
            <p>Website link refreshed two days ago.</p>
            <p>Sunday worship time edited last week.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
