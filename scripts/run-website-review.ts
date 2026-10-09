/**
 * Runs one batch of the automated website review against DATABASE_URL.
 *   npx tsx scripts/run-website-review.ts [batchSize]
 * Same code path as the weekly cron. It only records checks and queues
 * proposals; it never edits a listing.
 */
import { runWebsiteReview, listRecentChecks } from "@/lib/scan/website-review";

async function main() {
  const batch = Number(process.argv[2] ?? "5");
  const result = await runWebsiteReview({ batchSize: batch, budgetMs: 120_000 });
  console.log(JSON.stringify(result, null, 2));
  for (const check of await listRecentChecks(batch)) {
    console.log(`${check.outcome.padEnd(18)} ${String(check.httpStatus ?? "").padEnd(4)} ${check.church.name} — ${check.error ?? `${check.proposals} proposal(s)`}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
