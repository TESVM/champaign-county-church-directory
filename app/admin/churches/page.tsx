import Link from "next/link";
import { StatusFilter } from "@/components/admin/status-filter";
import { Pagination } from "@/components/ui/pagination";
import { requireStaff } from "@/lib/auth-guards";
import { listChurchesForAdmin } from "@/lib/services/churches";
import { formatDate } from "@/lib/utils";

export default async function AdminChurchesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  await requireStaff("/admin/churches");
  const params = await searchParams;
  const status = params.status ?? "ACTIVE";
  const result = await listChurchesForAdmin({ q: params.q, status: status === "ALL" ? undefined : status, page: Number(params.page ?? "1") || 1 });
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl">Churches ({result.total})</h1>
        <a href="/admin/export" className="inline-flex min-h-[44px] items-center rounded-full bg-brand-900 px-5 text-sm font-semibold text-white focus-ring">Export CSV</a>
      </div>
      <form action="/admin/churches" className="flex flex-wrap gap-2">
        <input type="hidden" name="status" value={status} />
        <label className="sr-only" htmlFor="admin-q">Search churches</label>
        <input id="admin-q" name="q" defaultValue={params.q} placeholder="Name, city, or slug" className="h-11 min-w-[240px] flex-1 rounded-full border border-line px-4" />
        <button className="min-h-[44px] rounded-full bg-brand-900 px-5 text-sm font-semibold text-white">Search</button>
      </form>
      <StatusFilter base="/admin/churches" current={status} options={[["ACTIVE", "Active"], ["CLOSED", "Closed"], ["HIDDEN", "Hidden"], ["MERGED", "Merged"], ["ALL", "All"]]} />
      <div className="overflow-x-auto rounded-[20px] border border-line bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-brand-50"><tr><th className="p-3">Church</th><th className="p-3">City</th><th className="p-3">Verification</th><th className="p-3">Photo</th><th className="p-3">Updated</th></tr></thead>
          <tbody>
            {result.rows.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="p-3"><Link className="font-semibold underline-offset-4 hover:underline" href={`/admin/churches/${c.slug}`}>{c.name}</Link>{c.status !== "ACTIVE" ? <span className="ml-2 text-xs uppercase text-amber-900">{c.status}</span> : null}{c.claimed ? <span className="ml-2 text-xs text-brand-700">managed</span> : null}</td>
                <td className="p-3">{c.city}</td>
                <td className="p-3">{c.leadershipConfirmedAt ? `Church confirmed ${formatDate(c.leadershipConfirmedAt.toISOString())}` : c.publicSourceCheckedAt ? `Source checked ${formatDate(c.publicSourceCheckedAt.toISOString())}` : "Not verified"}</td>
                <td className="p-3">{c.featuredImageUrl && !c.featuredImageIsAi ? "Yes" : "—"}</td>
                <td className="p-3 whitespace-nowrap">{c.lastUpdatedAt ? formatDate(c.lastUpdatedAt.toISOString()) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={result.page} pageCount={result.pageCount} basePath="/admin/churches" params={{ q: params.q, status }} />
    </div>
  );
}
