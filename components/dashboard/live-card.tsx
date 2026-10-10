import Link from "next/link";
import { markLiveAction } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/field";
import { formatChicago } from "@/lib/time/chicago";

export function LiveCard({ churchId, slug, livestreamUrl, allowed, liveUntil, canManage }: { churchId: string; slug: string; livestreamUrl?: string; allowed: boolean; liveUntil: Date | null; canManage: boolean }) {
  const live = Boolean(liveUntil && liveUntil > new Date());
  return (
    <Card className="p-6">
      <h2 className="font-display text-2xl">Live now</h2>
      {!allowed ? (
        <p className="mt-2 text-sm text-stone-700">
          Showing your church as live on Worship Live & Next is part of the Enhanced Church Profile.{" "}
          {canManage ? (
            <Link href={`/dashboard/churches/${slug}/billing`} className="font-semibold underline">
              See billing
            </Link>
          ) : null}
        </p>
      ) : !livestreamUrl ? (
        <p className="mt-2 text-sm text-stone-700">
          Add your livestream link on the{" "}
          <Link href={`/dashboard/churches/${slug}/edit`} className="underline">
            Listing
          </Link>{" "}
          tab first.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-stone-700">
            {live ? `Shown as live on your profile and Worship Live & Next until ${formatChicago(liveUntil!, { hour: "numeric", minute: "2-digit" })}.` : "When your service starts streaming, mark it live. It switches off on its own after the time you choose."}
          </p>
          <div className="mt-4">
            <ActionForm action={markLiveAction}>
              <input type="hidden" name="churchId" value={churchId} />
              {live ? (
                <SubmitButton name="end" value="true" variant="secondary">
                  End live status
                </SubmitButton>
              ) : (
                <>
                  <SelectField name="hours" label="Streaming for about" defaultValue="2" options={[1, 2, 3, 4].map((h) => ({ value: String(h), label: `${h} hour${h === 1 ? "" : "s"}` }))} />
                  <SubmitButton>We’re live now</SubmitButton>
                </>
              )}
            </ActionForm>
          </div>
        </>
      )}
    </Card>
  );
}
