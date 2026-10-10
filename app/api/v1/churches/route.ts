import type { NextRequest } from "next/server";
import { churchQuerySchema } from "@cccd/shared";
import { fetchChurches } from "@/lib/data/source";
import {
  apiPaginated,
  apiValidationError,
  decodeCursor,
  encodeCursor,
  withApiErrorHandling
} from "@/lib/api/response";

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = churchQuerySchema.safeParse(raw);

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const { cursor, limit, ...filters } = parsed.data;
  const offset = decodeCursor(cursor);

  // A database failure propagates out of fetchChurches and becomes a structured
  // 500 rather than being quietly replaced with in-repo records.
  const { items, total, nextOffset } = await fetchChurches(filters, offset, limit);

  return apiPaginated(
    items,
    {
      nextCursor: nextOffset === null ? null : encodeCursor(nextOffset),
      count: items.length,
      total
    },
    { cache: true }
  );
});
