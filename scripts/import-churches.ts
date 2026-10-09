/**
 * Imports researched church records into the database.
 *
 *   npx tsx scripts/import-churches.ts            # dry run: prints the plan
 *   npx tsx scripts/import-churches.ts --apply    # writes
 *
 * See docs/DATA_IMPORT.md. Never overwrites a church edited in the app or
 * confirmed by church leadership.
 */
import { PrismaClient } from "@prisma/client";
import { getPublishedChurches, getPublishedCities } from "@/lib/data/published";
import { countyCities } from "@/lib/data/mock";
import { runChurchImport } from "@/lib/import/church-import";

async function main() {
  const apply = process.argv.includes("--apply");
  const prisma = new PrismaClient();
  try {
    const cities = [...new Map([...getPublishedCities(), ...countyCities].map((c) => [c.slug, c])).values()];
    const { plan } = await runChurchImport(prisma, getPublishedChurches(), cities, { apply });
    const counts = plan.reduce<Record<string, number>>((acc, step) => {
      acc[step.action] = (acc[step.action] ?? 0) + 1;
      return acc;
    }, {});
    for (const step of plan) {
      if (step.action !== "create" && !(step.action === "skip" && step.reason === "unchanged")) {
        console.log(`${step.action.padEnd(6)} ${step.slug}${"reason" in step ? `  (${step.reason})` : ""}`);
      }
    }
    console.log(`\n${apply ? "Applied" : "Dry run"}: ${JSON.stringify(counts)}`);
    if (!apply) console.log("Nothing was written. Re-run with --apply to import.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
