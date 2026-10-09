import { authSecret } from "@/lib/env";
import { db } from "@/lib/db";
import { RateLimitedError } from "@/lib/errors";
import { keyedHash } from "@/lib/security";

/**
 * Fixed-window limiter stored in Postgres, so it holds across serverless
 * instances. Keys are hashed; raw IPs and emails are never stored.
 */
export async function rateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowSeconds: number
) {
  const prisma = await db();
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const key = `${scope}:${keyedHash(identifier, authSecret)}`;

  const row = await prisma.rateLimit.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: 1 },
    update: { count: { increment: 1 } }
  });

  if (row.count > limit) {
    throw new RateLimitedError();
  }
}

/** Occasional cleanup; called from the weekly cron. */
export async function pruneRateLimits() {
  const prisma = await db();
  const cutoff = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 2;
  await prisma.rateLimit.deleteMany({ where: { windowStart: { lt: cutoff } } });
}
