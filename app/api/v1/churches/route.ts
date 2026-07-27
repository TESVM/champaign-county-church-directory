import type { NextRequest } from "next/server";
import { churchQuerySchema } from "@cccd/shared";
import { listChurches } from "@/lib/api/churches";
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
  const { items, total, nextOffset } = await listChurches(filters, offset, limit);

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
