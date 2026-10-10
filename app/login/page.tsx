import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { passwordSignInAction, requestSignInAction } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { getActor } from "@/lib/auth";
import { env } from "@/lib/env";
import { safeReturnPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Church Sign In", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const next = safeReturnPath(params.next, "/dashboard");
  const actor = await getActor();
  if (actor.kind === "user") redirect(next === "/dashboard" && actor.staffRole ? "/admin" : next);

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
      <Card className="p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">Church sign in</p>
        <h1 className="mt-3 font-display text-4xl">Sign in with your email</h1>
        <p className="mt-3 text-sm leading-6 text-stone-700">
          We email you a one-time link. There is no password to remember. Use the address your access was approved for.
        </p>
        {params.error === "link" ? (
          <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-900">
            That sign-in link is invalid, already used, or expired. Request a new one below.
          </p>
        ) : null}
        <div className="mt-6">
          <ActionForm action={requestSignInAction} fieldLabels={{ email: "Email" }}>
            <input type="hidden" name="next" value={next} />
            <TextField name="email" label="Email address" type="email" required autoComplete="email" />
            <SubmitButton pendingLabel="Sending…">Email me a sign-in link</SubmitButton>
          </ActionForm>
        </div>
        {env.adminPassword ? (
          <details className="mt-8 rounded-2xl border border-line p-4">
            <summary className="cursor-pointer text-sm font-semibold text-ink">Directory administrator password sign-in</summary>
            <div className="mt-4">
              <ActionForm action={passwordSignInAction}>
                <input type="hidden" name="next" value={safeReturnPath(params.next, "/admin")} />
                <TextField name="email" label="Administrator email" type="email" required autoComplete="username" />
                <TextField name="password" label="Password" type="password" required autoComplete="current-password" />
                <SubmitButton pendingLabel="Signing in…" variant="secondary">Sign in</SubmitButton>
              </ActionForm>
            </div>
          </details>
        ) : null}
      </Card>
      <Card className="bg-brand-900 p-6 text-white sm:p-8">
        <h2 className="font-display text-3xl">Don’t have access yet?</h2>
        <p className="mt-3 text-sm leading-6 text-white/85">
          Church leaders request access to their church’s listing first. A reviewer confirms you are authorised, then you can sign in here. It is free.
        </p>
        <Link href="/claim" className="mt-5 inline-flex min-h-[44px] items-center rounded-full bg-white px-5 text-sm font-semibold text-brand-900 focus-ring">
          Request to manage a listing
        </Link>
        <p className="mt-6 text-sm leading-6 text-white/75">
          Already approved and invited by a colleague? Sign in with the address they added.
        </p>
      </Card>
    </div>
  );
}
