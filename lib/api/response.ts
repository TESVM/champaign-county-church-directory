import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  HTTP_STATUS_BY_ERROR_CODE,
  type ApiErrorCode,
  type Pagination
} from "@cccd/shared";

/**
 * Response helpers for `/api/v1`.
 *
 * Every handler returns the same envelope so clients have one success shape and
 * one failure shape to parse. Errors carry a `requestId` that is also logged
 * server-side, which is what makes a user report traceable.
 */

/** Public caching for anonymous directory reads; safe because no per-user data. */
const PUBLIC_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=3600";

export function apiSuccess<T>(
  data: T,
  init?: { status?: number; cache?: boolean }
) {
  const response = NextResponse.json(
    { ok: true as const, data },
    { status: init?.status ?? 200 }
  );

  if (init?.cache) {
    response.headers.set("Cache-Control", PUBLIC_CACHE_CONTROL);
  }

  return response;
}

export function apiPaginated<T>(
  data: T[],
  pagination: Pagination,
  init?: { cache?: boolean }
) {
  const response = NextResponse.json({ ok: true as const, data, pagination });

  if (init?.cache) {
    response.headers.set("Cache-Control", PUBLIC_CACHE_CONTROL);
  }

  return response;
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  init?: {
    fieldErrors?: Array<{ path: string; message: string }>;
    /** Logged but never returned to the client. */
    cause?: unknown;
  }
) {
  const requestId = randomUUID();
  const status = HTTP_STATUS_BY_ERROR_CODE[code];

  if (status >= 500) {
    console.error(
      JSON.stringify({
        level: "error",
        requestId,
        code,
        message,
        cause: init?.cause instanceof Error ? init.cause.message : String(init?.cause ?? "")
      })
    );
  }

  return NextResponse.json(
    {
      ok: false as const,
      error: {
        code,
        message,
        ...(init?.fieldErrors ? { fieldErrors: init.fieldErrors } : {}),
        requestId
      }
    },
    { status }
  );
}

/** Converts a Zod failure into a 422 with per-field detail. */
export function apiValidationError(error: z.ZodError) {
  return apiError("validation_failed", "Some values were not accepted.", {
    fieldErrors: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message
    }))
  });
}

/**
 * Wraps a handler so an unexpected throw becomes a structured 500 instead of an
 * HTML error page a native client cannot parse.
 */
export function withApiErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return apiError("internal_error", "Something went wrong on our end.", {
        cause: error
      });
    }
  };
}

/** Opaque cursor so clients cannot depend on its internals. */
export function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ o: offset })).toString("base64url");
}

export function decodeCursor(cursor?: string): number {
  if (!cursor) return 0;

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    const offset = Number(parsed?.o);
    return Number.isInteger(offset) && offset >= 0 ? offset : 0;
  } catch {
    return 0;
  }
}
