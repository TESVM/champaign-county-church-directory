import type { Prisma, PrismaClient } from "@prisma/client";
import { type Actor, actorLabel } from "@/lib/actor";
import { db } from "@/lib/db";

type Client = PrismaClient | Prisma.TransactionClient;

export async function audit(
  actor: Actor,
  entry: {
    action: string;
    entityType: string;
    entityId?: string | null;
    churchId?: string | null;
    summary: string;
    details?: Prisma.InputJsonValue;
  },
  client?: Client
) {
  const prisma = client ?? (await db());
  await prisma.auditLog.create({
    data: {
      actorId: actor.kind === "user" ? actor.id : null,
      actorEmail: actorLabel(actor),
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      churchId: entry.churchId ?? null,
      summary: entry.summary,
      details: entry.details
    }
  });
}

export async function listAuditLog(options: { churchId?: string; take?: number } = {}) {
  const prisma = await db();
  return prisma.auditLog.findMany({
    where: options.churchId ? { churchId: options.churchId } : undefined,
    orderBy: { createdAt: "desc" },
    take: options.take ?? 100
  });
}
