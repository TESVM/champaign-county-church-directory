import { env } from "@/lib/env";
import { getPublishedChurches } from "@/lib/data/published";

/**
 * Data for the admin AI Images page: every church with the state of its
 * profile image, so an admin can see at a glance which churches still need one.
 */

export type ChurchImageState = "ready" | "generated" | "photo" | "pending" | "failed";

export type ChurchImageRow = {
  slug: string;
  name: string;
  city: string;
  imageUrl: string | null;
  state: ChurchImageState;
  error: string | null;
};

export type ChurchImageFilter = "all" | ChurchImageState;

const STALE_PENDING_MS = 5 * 60 * 1000;

function deriveState(row: {
  featuredImageUrl: string | null;
  featuredImageIsAi: boolean;
  aiImageStatus: string;
  aiImageRequestedAt: Date | null;
}): ChurchImageState {
  if (
    row.aiImageStatus === "PENDING" &&
    row.aiImageRequestedAt &&
    Date.now() - row.aiImageRequestedAt.getTime() < STALE_PENDING_MS
  ) {
    return "pending";
  }
  if (row.featuredImageUrl && !row.featuredImageIsAi) return "photo";
  if (row.featuredImageUrl && row.featuredImageIsAi) return "generated";
  if (row.aiImageStatus === "FAILED") return "failed";
  return "ready";
}

async function loadAll(): Promise<ChurchImageRow[]> {
  if (!env.hasDatabase) {
    // Without a database nothing can be generated or saved, but the page still
    // lists churches so an admin can see what the feature covers.
    return getPublishedChurches().map((church) => ({
      slug: church.slug,
      name: church.name,
      city: church.city,
      imageUrl: church.featuredImageUrl ?? null,
      state: church.featuredImageUrl ? "photo" : "ready",
      error: null
    }));
  }

  const { prisma } = await import("@/lib/prisma/client");
  const rows = await prisma.church.findMany({
    select: {
      slug: true,
      name: true,
      city: true,
      featuredImageUrl: true,
      featuredImageIsAi: true,
      aiImageStatus: true,
      aiImageError: true,
      aiImageRequestedAt: true,
      cityRecord: { select: { name: true } }
    },
    orderBy: [{ name: "asc" }]
  });

  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    city: row.cityRecord?.name ?? row.city,
    imageUrl: row.featuredImageUrl,
    state: deriveState(row),
    error: row.aiImageError
  }));
}

export async function listChurchImagesForAdmin(options: {
  q?: string;
  filter: ChurchImageFilter;
  page: number;
  pageSize: number;
}) {
  const all = await loadAll();

  const counts: Record<ChurchImageState, number> = {
    ready: 0,
    generated: 0,
    photo: 0,
    pending: 0,
    failed: 0
  };
  for (const row of all) counts[row.state] += 1;

  const needle = options.q?.trim().toLowerCase();
  const filtered = all.filter((row) => {
    if (options.filter !== "all" && row.state !== options.filter) return false;
    if (needle && !`${row.name} ${row.city} ${row.slug}`.toLowerCase().includes(needle)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / options.pageSize));
  const page = Math.min(Math.max(1, options.page), totalPages);
  const items = filtered.slice((page - 1) * options.pageSize, page * options.pageSize);

  const names = Object.fromEntries(all.map((row) => [row.slug, row.name]));

  return { items, counts, total: filtered.length, page, totalPages, names };
}
