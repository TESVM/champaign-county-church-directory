import type { PrismaClient } from "@prisma/client";
import { DatabaseUnavailableError } from "@/lib/errors";

/**
 * The only way application code reaches the database.
 *
 * There is no static fallback. Every page, API route, and admin screen reads
 * the same tables, so a saved edit shows up everywhere and an outage shows up
 * as an honest error instead of plausible stale data.
 */
export async function db(): Promise<PrismaClient> {
  if (!process.env.DATABASE_URL) {
    throw new DatabaseUnavailableError(
      "DATABASE_URL is not configured. Run `npm run db:local` for a local database, or set DATABASE_URL."
    );
  }

  const { prisma } = await import("@/lib/prisma/client");
  return prisma;
}

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}
