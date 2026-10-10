import { FlashBanner } from "@/components/admin/flash-banner";
import Link from "next/link";
import { resolveContactAction, resolveCorrectionAction } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { requireStaff } from "@/lib/auth-guards";
import { listContactMessages, listCorrections } from "@/lib/services/inbox";
import { formatDate } from "@/lib/utils";

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ status?: string; done?: string }> }) {
  const actor = await requireStaff("/admin/inbox");
  const params = await searchParams;
  const status = params.status === "ALL" ? "ALL" : "NEW";
  const [messages, corrections] = await Promise.all([listContactMessages(actor, status), listCorrections(actor, status)]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl">Messages and corrections</h1>
        <div className="w-full"><FlashBanner code={params.done} /></div>
        <Link href={status === "ALL" ? "/admin/inbox" : "/admin/inbox?status=ALL"} className="text-sm font-semibold underline">{status === "ALL" ? "Show open only" : "Show all, including resolved"}</Link>
      </div>
      <section aria-labelledby="corr">
        <h2 id="corr" className="font-display text-2xl">Correction reports ({corrections.length})</h2>
        <div className="mt-3 space-y-3">
          {corrections.length === 0 ? <p className="text-sm text-stone-600">None.</p> : null}
          {corrections.map((r) => (
            <Card key={r.id} className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">{r.status} · {formatDate(r.createdAt.toISOString())} · {r.fieldName ?? "general"}</p>
              <h3 className="font-display text-xl"><Link className="hover:underline" href={`/admin/churches/${r.church.slug}`}>{r.church.name}</Link></h3>
              <p className="mt-2 whitespace-pre-line text-sm">{r.details}</p>
              <p className="mt-1 text-xs text-stone-600">{r.reporterName || r.reporterEmail ? `From ${[r.reporterName, r.reporterEmail].filter(Boolean).join(" · ")}` : "Anonymous"}</p>
              {r.status === "NEW" ? (
                <div className="mt-3">
                  <ActionForm action={resolveCorrectionAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <TextField name="note" label="Note (emailed to the reporter when resolved, if they left an email)" />
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/dashboard/churches/${r.church.slug}/edit`} className="inline-flex min-h-[44px] items-center rounded-full border border-line px-4 text-sm font-semibold">Edit listing</Link>
                      <SubmitButton name="status" value="RESOLVED">Mark fixed</SubmitButton>
                      <SubmitButton name="status" value="DISMISSED" variant="secondary">Dismiss</SubmitButton>
                    </div>
                  </ActionForm>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      </section>
      <section aria-labelledby="msgs">
        <h2 id="msgs" className="font-display text-2xl">Contact messages ({messages.length})</h2>
        <div className="mt-3 space-y-3">
          {messages.length === 0 ? <p className="text-sm text-stone-600">None.</p> : null}
          {messages.map((m) => (
            <Card key={m.id} className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">{m.status} · {formatDate(m.createdAt.toISOString())}</p>
              <p className="font-semibold">{m.name} · <a className="underline" href={`mailto:${m.email}`}>{m.email}</a>{m.organization ? ` · ${m.organization}` : ""}</p>
              <p className="mt-2 whitespace-pre-line text-sm">{m.message}</p>
              {m.status === "NEW" ? (
                <div className="mt-3">
                  <ActionForm action={resolveContactAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <div className="flex flex-wrap gap-2">
                      <SubmitButton name="status" value="RESOLVED">Mark answered</SubmitButton>
                      <SubmitButton name="status" value="DISMISSED" variant="secondary">Dismiss (spam)</SubmitButton>
                    </div>
                  </ActionForm>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
