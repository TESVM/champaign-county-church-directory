import type { Metadata } from "next";
import Link from "next/link";
import { CollabPostForm } from "@/components/collab/post-form";
import { FormShell } from "@/components/forms/form-shell";
import { isStaff } from "@/lib/actor";
import { getActor } from "@/lib/auth";
import { addDays, chicagoDateOf } from "@/lib/time/chicago";

export const metadata: Metadata = { title: "Share an Opportunity", robots: { index: false } };

export default async function NewCollabPostPage({ searchParams }: { searchParams: Promise<{ church?: string }> }) {
  const actor = await getActor();
  const { church } = await searchParams;
  const signedIn = actor.kind === "user";
  const churches = signedIn ? actor.memberships.map((m) => ({ id: m.churchId, name: m.churchName })) : [];
  const staff = signedIn && isStaff(actor);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <FormShell title="Share an opportunity" description="Post a need or an offer for other churches and ministries in Champaign County. A reviewer checks every post before it appears.">
        {churches.length || staff ? (
          <CollabPostForm churches={churches} staff={staff} defaultChurchId={churches.find((c) => c.id === church)?.id} defaultEnd={addDays(chicagoDateOf(new Date()), 30)} />
        ) : (
          <div className="space-y-3 text-stone-700">
            <p>Posts come from church teams who manage their listing, so other churches know who they are working with.</p>
            <p>
              {signedIn ? "Your account does not manage a church listing yet. " : null}
              <Link href={signedIn ? "/claim" : "/login?next=/collaborate/new"} className="font-semibold text-brand-900 underline">
                {signedIn ? "Claim your church’s listing" : "Sign in"}
              </Link>
              {signedIn ? " to post." : " with your church email to post. New here? Claim your church’s listing first."}
            </p>
            <p>
              Leading a ministry without a church listing?{" "}
              <Link href="/contact" className="underline">
                Contact us
              </Link>{" "}
              and we can post it for you.
            </p>
          </div>
        )}
      </FormShell>
    </div>
  );
}
