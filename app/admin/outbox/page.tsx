import { Card } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth-guards";
import { env } from "@/lib/env";
import { listOutbox } from "@/lib/services/email";

export default async function OutboxPage() {
  await requireStaff("/admin/outbox");
  const emails = await listOutbox(100);
  const logOnly = env.emailProvider === "log";
  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl">Email log</h1>
      {logOnly ? (
        <p role="status" className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">
          EMAIL_PROVIDER is “log”: emails are recorded here and not delivered. Configure Resend before launch.
        </p>
      ) : null}
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-brand-50"><tr><th className="p-3">When (UTC)</th><th className="p-3">To</th><th className="p-3">Subject</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {emails.map((e) => (
              <tr key={e.id} className="border-t border-line align-top">
                <td className="whitespace-nowrap p-3">{e.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td className="p-3">{e.to}</td>
                <td className="p-3">{e.subject}{logOnly && env.isDevelopment && e.body && !/sign-in link/i.test(e.subject) ? <details className="mt-1"><summary className="cursor-pointer text-xs">Body</summary><pre className="whitespace-pre-wrap text-xs">{e.body}</pre></details> : null}</td>
                <td className="p-3">{e.status.toLowerCase()}{e.error ? ` — ${e.error}` : ""}</td>
              </tr>
            ))}
            {emails.length === 0 ? <tr><td colSpan={4} className="p-3 text-stone-600">No emails yet.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
