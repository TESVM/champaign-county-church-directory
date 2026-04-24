import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/forms/login-form";
import { auth } from "@/lib/auth";
import type { DirectoryRole } from "@/lib/types";

function canAccessAdmin(role?: DirectoryRole) {
  return role === "ADMIN" || role === "REVIEWER" || role === "SUPPORT";
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const loginError = Array.isArray(resolvedSearchParams.error) ? resolvedSearchParams.error[0] : resolvedSearchParams.error;
  const nextPath = Array.isArray(resolvedSearchParams.next) ? resolvedSearchParams.next[0] : resolvedSearchParams.next;
  const session = await auth();

  if (session?.user?.email) {
    if (nextPath === "/admin" && canAccessAdmin(session.user.role)) {
      redirect("/admin");
    }

    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <Card className="section-strong border-white/70 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">Church Access</p>
          <h1 className="mt-4 font-display text-5xl">Claimed churches get a secure editing dashboard.</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-600">
            Pastors and delegated admins can review listing details, stage updates, manage staff access, and keep their church page current after verification.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Claim verification", "Domain email, public phone, or manual review before edit access is granted."],
              ["Shared staff access", "Owners can invite editors while keeping a single accountable owner on the record."],
              ["Review-safe updates", "High-risk fields stay in review so public trust stays intact."]
            ].map(([title, body]) => (
              <div key={title} className="rounded-[24px] bg-white/80 p-5 ring-1 ring-brand-100">
                <p className="font-semibold text-ink">{title}</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-[28px] bg-brand-900 p-6 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-300">Need access?</p>
            <p className="mt-3 text-sm leading-7 text-white/82">
              If your church is not yet claimed, start with the public claim request flow and provide a verification method that reasonably proves you are authorized to manage the listing.
            </p>
            <Button asChild variant="secondary" className="mt-4">
              <Link href="/claim">Claim a church listing</Link>
            </Button>
          </div>
        </Card>

        <Card className="border-white/70 bg-gradient-to-br from-white via-brand-50 to-sky/30 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">Sign in</p>
          <h2 className="mt-4 font-display text-3xl">Church editors and directory admins</h2>
          <LoginForm error={loginError} nextPath={nextPath} />
          <div className="mt-6 rounded-2xl bg-white/70 p-4 text-sm leading-6 text-stone-700 ring-1 ring-brand-100">
            <p className="font-semibold text-ink">Demo accounts</p>
            <p className="mt-2"><code>admin@countychurchdirectory.local / admin</code></p>
            <p><code>reviewer@countychurchdirectory.local / review</code></p>
            <p><code>office@sherifftemple.example / church</code></p>
            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-brand-700">Temporary church access</p>
            <p className="mt-1 text-sm text-stone-600">Approved church-owner and church-editor records stored in the database can sign in with their email and the temporary password <code>church</code> until a full passwordless or email-link auth flow replaces this MVP path.</p>
            <p className="mt-3 text-xs text-stone-500">Production can override the admin credentials with <code>ADMIN_EMAIL</code> and <code>ADMIN_PASSWORD</code>.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
