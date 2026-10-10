import { Card } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth-guards";
import { listAuditLog } from "@/lib/services/audit";

export default async function AuditPage() {
  await requireStaff("/admin/audit");
  const entries = await listAuditLog({ take: 200 });
  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl">Audit log</h1>
      <p className="text-sm text-stone-700">Every approval, listing edit, access change, billing change, and export, newest first.</p>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-brand-50"><tr><th className="p-3">When (UTC)</th><th className="p-3">Who</th><th className="p-3">Action</th><th className="p-3">Summary</th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-line align-top">
                <td className="whitespace-nowrap p-3">{e.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td className="p-3">{e.actorEmail}</td>
                <td className="p-3">{e.action}</td>
                <td className="p-3">{e.summary}</td>
              </tr>
            ))}
            {entries.length === 0 ? <tr><td colSpan={4} className="p-3 text-stone-600">No entries yet.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
