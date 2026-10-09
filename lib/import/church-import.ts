import { readFileSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { parseTimeToMinutes } from "@/lib/time/chicago";
import type { ChurchRecord, CityRecord } from "@/lib/types";

/**
 * Imports the researched church records in lib/data/mock.ts into Postgres.
 *
 * Safe to run repeatedly and against a live database:
 *  - fixtures (`isFixture`) are never imported;
 *  - a church edited in the database after it was imported, or confirmed by
 *    church leadership, is never overwritten; it is reported as a conflict;
 *  - a record is only updated when the file's `lastUpdatedAt` is newer than
 *    what the database already holds;
 *  - accounts, claims, memberships, subscriptions and premium flags are never
 *    created or changed.
 */

export type ImportAction =
  | { slug: string; action: "create" }
  | { slug: string; action: "update"; reason: string }
  | { slug: string; action: "skip"; reason: string };

const PLACEHOLDER_PASTOR = /not publicly listed|leadership not listed/i;

/** Reads the provenance table in CHURCH_IMAGE_SOURCES.md: local file → source URL and note. */
export function readImageProvenance(root = process.cwd()) {
  const map = new Map<string, { sourceUrl: string; note: string }>();
  try {
    const text = readFileSync(path.join(root, "CHURCH_IMAGE_SOURCES.md"), "utf8");
    for (const line of text.split("\n")) {
      const cells = line.split("|").map((c) => c.trim());
      if (cells.length < 5) continue;
      const file = cells[2]?.replace(/`/g, "");
      if (!file?.startsWith("public/churches/")) continue;
      map.set(`/${file.replace(/^public\//, "")}`, { sourceUrl: cells[3], note: cells[4] });
    }
  } catch {
    // Missing file just means no provenance to attach.
  }
  return map;
}

export function planChurchImport(
  records: ChurchRecord[],
  existing: Map<
    string,
    { lastUpdatedAt: Date | null; importedSourceUpdatedAt: Date | null; leadershipConfirmedAt: Date | null; claimed: boolean }
  >
): ImportAction[] {
  return records
    .filter((record) => record.isFixture !== true)
    .map((record) => {
      const row = existing.get(record.slug);
      if (!row) return { slug: record.slug, action: "create" as const };

      const fileUpdated = new Date(record.lastUpdatedAt).getTime();
      const dbUpdated = row.lastUpdatedAt?.getTime() ?? 0;
      const imported = row.importedSourceUpdatedAt?.getTime() ?? null;

      if (row.leadershipConfirmedAt || row.claimed) {
        return { slug: record.slug, action: "skip" as const, reason: "managed or confirmed by church leadership" };
      }
      // Edited in the app since the last import (or, for databases seeded before
      // import tracking existed, newer than the file).
      if ((imported !== null && dbUpdated > imported + 60_000) || dbUpdated > fileUpdated) {
        return { slug: record.slug, action: "skip" as const, reason: "database has newer edits" };
      }
      if (fileUpdated > dbUpdated || imported === null) {
        return { slug: record.slug, action: "update" as const, reason: "file record is newer" };
      }
      return { slug: record.slug, action: "skip" as const, reason: "unchanged" };
    });
}

export async function runChurchImport(
  prisma: PrismaClient,
  records: ChurchRecord[],
  cities: CityRecord[],
  options: { apply: boolean; root?: string }
) {
  const provenance = readImageProvenance(options.root);
  const rows = await prisma.church.findMany({
    select: { slug: true, lastUpdatedAt: true, importedSourceUpdatedAt: true, leadershipConfirmedAt: true, claimed: true }
  });
  const existing = new Map(rows.map((r) => [r.slug, r]));
  const plan = planChurchImport(records, existing);

  if (!options.apply) return { plan, applied: false };

  for (const city of cities) {
    await prisma.city.upsert({
      where: { slug: city.slug },
      update: {},
      create: { name: city.name, slug: city.slug, county: city.county, state: city.state, description: city.description }
    });
    await prisma.city.updateMany({ where: { slug: city.slug, description: null }, data: { description: city.description } });
  }

  const bySlug = new Map(records.map((r) => [r.slug, r]));

  for (const step of plan) {
    if (step.action === "skip") continue;
    const record = bySlug.get(step.slug)!;
    const city = await prisma.city.findUniqueOrThrow({ where: { slug: record.citySlug } });
    const lastUpdated = new Date(record.lastUpdatedAt);
    const image = record.featuredImageUrl ? provenance.get(record.featuredImageUrl) : undefined;

    const fields = {
      name: record.name,
      cityId: city.id,
      city: city.name,
      state: record.state,
      denomination: record.denomination ?? null,
      description: record.description || null,
      address1: record.address1 || null,
      zip: record.zip || null,
      phone: record.phone ?? null,
      email: record.email ?? null,
      websiteUrl: record.websiteUrl ?? null,
      appUrl: record.appUrl ?? null,
      appStoreUrl: record.appStoreUrl ?? null,
      googlePlayUrl: record.googlePlayUrl ?? null,
      livestreamUrl: record.livestreamUrl ?? null,
      logoUrl: record.logoUrl ?? null,
      featuredImageUrl: record.featuredImageUrl ?? null,
      featuredImageIsAi: false,
      featuredImageSourceUrl: image?.sourceUrl ?? (record.featuredImageUrl?.startsWith("http") ? record.featuredImageUrl : null),
      featuredImageCredit: image ? "Published by the congregation or an exact-match listing" : null,
      featuredImagePermission: image?.note ?? null,
      latitude: record.latitude ?? null,
      longitude: record.longitude ?? null,
      geocodedAt: record.latitude != null ? lastUpdated : null,
      verified: record.verified,
      publicSourceUrl: record.verified ? record.websiteUrl ?? record.socialLinks[0]?.url ?? null : null,
      publicSourceCheckedAt: record.verified ? lastUpdated : null,
      lastUpdatedAt: lastUpdated,
      importedSourceUpdatedAt: lastUpdated
    };

    await prisma.$transaction(async (tx) => {
      const church = await tx.church.upsert({
        where: { slug: record.slug },
        create: { slug: record.slug, ...fields },
        update: fields
      });

      // Senior pastor: reuse the existing row so pastor ids stay stable.
      const pastorName = record.pastor?.fullName?.trim();
      if (pastorName && !PLACEHOLDER_PASTOR.test(pastorName)) {
        if (church.seniorPastorId) {
          await tx.pastor.update({
            where: { id: church.seniorPastorId },
            data: { fullName: pastorName, title: record.pastor.title || "Pastor", bio: record.pastor.bio ?? null }
          });
        } else {
          const pastor = await tx.pastor.create({
            data: { fullName: pastorName, title: record.pastor.title || "Pastor", bio: record.pastor.bio ?? null }
          });
          await tx.church.update({ where: { id: church.id }, data: { seniorPastorId: pastor.id } });
        }
      } else if (church.seniorPastorId) {
        await tx.church.update({ where: { id: church.id }, data: { seniorPastorId: null } });
      }

      await tx.pastor.deleteMany({ where: { churchId: church.id } });
      const leaders = (record.leadership ?? []).filter((l) => !PLACEHOLDER_PASTOR.test(l.fullName));
      if (leaders.length) {
        await tx.pastor.createMany({
          data: leaders.map((l) => ({ churchId: church.id, fullName: l.fullName, title: l.title || null }))
        });
      }

      await tx.serviceTime.deleteMany({ where: { churchId: church.id } });
      if (record.serviceTimes.length) {
        await tx.serviceTime.createMany({
          data: record.serviceTimes.map((s) => ({
            churchId: church.id,
            serviceName: s.serviceName,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime ?? null,
            notes: s.notes ?? null,
            startMinutes: parseTimeToMinutes(s.startTime)
          }))
        });
      }

      await tx.ministry.deleteMany({ where: { churchId: church.id } });
      if (record.ministries.length) {
        await tx.ministry.createMany({
          data: [...new Set(record.ministries)].map((name) => ({ churchId: church.id, name }))
        });
      }

      await tx.socialLink.deleteMany({ where: { churchId: church.id } });
      if (record.socialLinks.length) {
        await tx.socialLink.createMany({
          data: record.socialLinks.map((l) => ({ churchId: church.id, platform: l.platform, url: l.url }))
        });
      }

      await tx.auditLog.create({
        data: {
          actorEmail: "system:import",
          action: step.action === "create" ? "church.imported" : "church.import_updated",
          entityType: "Church",
          entityId: church.id,
          churchId: church.id,
          summary: `${step.action === "create" ? "Imported" : "Refreshed"} from researched records (lib/data/mock.ts)`
        }
      });
    });
  }

  return { plan, applied: true };
}
