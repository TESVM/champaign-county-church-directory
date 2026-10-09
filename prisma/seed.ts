/**
 * `prisma db seed` imports only real, researched church records.
 *
 * It creates no users, claims, memberships, or audit entries: the previous seed
 * inserted invented claim requests and a church-owner account, which then
 * appeared in the admin screens as if real people had submitted them. The
 * administrator account is created the first time ADMIN_EMAIL signs in.
 */
import { PrismaClient } from "@prisma/client";
import { countyCities } from "@/lib/data/mock";
import { getPublishedChurches } from "@/lib/data/published";
import { runChurchImport } from "@/lib/import/church-import";

const prisma = new PrismaClient();

runChurchImport(prisma, getPublishedChurches(), countyCities, { apply: true })
  .then(({ plan }) => {
    const created = plan.filter((p) => p.action === "create").length;
    const updated = plan.filter((p) => p.action === "update").length;
    console.log(`Seed complete: ${created} created, ${updated} updated, ${plan.length - created - updated} unchanged or protected.`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
