import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { SuggestedChangeRecord } from "@/lib/types";

export function ReviewComparisonCard({ change }: { change: SuggestedChangeRecord }) {
  return (
    <Card className="border-white/70 bg-gradient-to-br from-white via-brand-50 to-sky/40 p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">{change.fieldName}</p>
          <h3 className="font-display text-2xl">{change.churchName}</h3>
          <p className="text-sm text-stone-500">Queued {formatDate(change.createdAt)}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-rose/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose">Current</p>
              <p className="mt-2 text-sm text-stone-700">{change.oldValue}</p>
            </div>
            <div className="rounded-2xl bg-sage/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage">Suggested</p>
              <p className="mt-2 text-sm text-stone-700">{change.newValue}</p>
            </div>
          </div>
          <p className="text-sm text-stone-600">
            Confidence score: <span className="font-semibold text-ink">{Math.round(change.confidenceScore * 100)}%</span>
          </p>
          <Link href={change.sourceUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-900">
            View source
          </Link>
        </div>
        <div className="rounded-[24px] bg-white/70 p-2 shadow-card">
          <div className="flex gap-2">
            <Button variant="secondary">Reject</Button>
            <Button>Edit</Button>
            <Button variant="secondary">Approve</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
