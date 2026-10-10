/**
 * Compares the live public API with the researched records in lib/data/mock.ts.
 *   npx tsx scripts/audit-live.ts [baseUrl]
 * Read-only. Reports, per church, every free (always-public) field that differs.
 */
import { getPublishedChurches } from "@/lib/data/published";
import { parseDisplayTime } from "@/lib/api/serializers";

const base = process.argv[2] ?? "https://www.champaigncountychurches.com";
const PLACEHOLDER = /not publicly listed|leadership not listed/i;
const norm = (v: unknown) => (v === undefined || v === null ? "" : String(v).trim().replace(/\/$/, "").toLowerCase());
const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

async function main() {
  const records = getPublishedChurches();
  const report: string[] = [];
  let ok = 0;
  for (const r of records) {
    const res = await fetch(`${base}/api/v1/churches/${r.slug}`, { headers: { accept: "application/json" } });
    if (!res.ok) {
      report.push(`MISSING ${r.slug} (HTTP ${res.status})`);
      continue;
    }
    const d = (await res.json()).data;
    const diffs: string[] = [];
    const cmp = (label: string, a: unknown, b: unknown, f = norm) => {
      if (f(a) !== f(b)) diffs.push(`${label}: live="${String(a ?? "").slice(0, 70)}" research="${String(b ?? "").slice(0, 70)}"`);
    };
    cmp("name", d.name, r.name);
    cmp("city", d.city.slug, r.citySlug);
    cmp("address", d.address.line1, r.address1);
    cmp("zip", d.address.zip, r.zip);
    cmp("phone", d.contact.phone, r.phone, digits);
    cmp("email", d.contact.email, r.email);
    cmp("website", d.contact.websiteUrl, r.websiteUrl);
    cmp("denomination", d.denomination, r.denomination);
    cmp("pastor", d.seniorPastor?.fullName, PLACEHOLDER.test(r.pastor.fullName) ? "" : r.pastor.fullName);
    cmp("description", d.description, r.description);
    const liveSvc = d.serviceTimes.map((s: { dayOfWeek: string; startTime: string }) => `${s.dayOfWeek.toLowerCase()} ${s.startTime}`).sort().join("; ");
    const resSvc = r.serviceTimes.map((s) => `${s.dayOfWeek.toLowerCase()} ${parseDisplayTime(s.startTime) ?? s.startTime}`).sort().join("; ");
    cmp("services", liveSvc, resSvc);
    const livePhoto = d.media.featuredImageUrl ?? "";
    const resPhoto = r.featuredImageUrl ?? "";
    if (resPhoto && !livePhoto.startsWith(resPhoto.split("?")[0].slice(0, 40))) {
      diffs.push(`photo: live=${livePhoto.startsWith("data:") ? "uploaded-on-site" : livePhoto.slice(0, 50) || "none"} research=${resPhoto.slice(0, 50)}`);
    }
    if (diffs.length) report.push(`DIFF ${r.slug}\n   ${diffs.join("\n   ")}`);
    else ok += 1;
  }
  console.log(`${records.length} researched churches; ${ok} match exactly; ${records.length - ok} differ or missing.\n`);
  console.log(report.join("\n"));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
