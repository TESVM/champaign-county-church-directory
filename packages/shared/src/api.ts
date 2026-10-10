import { z } from "zod";

/**
 * Transport contract shared by the web API handlers and every client.
 *
 * The existing app has three different response conventions (`{ok, error}`,
 * `{error}`, and redirect query params like `?saved=media`). A native client
 * cannot follow redirects as a success signal, so `/api/v1` standardises on one
 * envelope with a stable machine-readable error code.
 */

export const API_VERSION = "v1" as const;

/** Stable, machine-readable failure reasons. Clients switch on these, not prose. */
export const apiErrorCodeSchema = z.enum([
  "bad_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "validation_failed",
  "rate_limited",
  "internal_error",
  "service_unavailable"
]);

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

/** Field-level validation detail, keyed by dotted path. */
export const apiFieldErrorSchema = z.object({
  path: z.string(),
  message: z.string()
});

export const apiErrorSchema = z.object({
  code: apiErrorCodeSchema,
  /** Human-readable and safe to display; never contains internal detail. */
  message: z.string(),
  fieldErrors: z.array(apiFieldErrorSchema).optional(),
  /** Correlates a user report with a server log line. */
  requestId: z.string().optional()
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const paginationSchema = z.object({
  /** Opaque cursor for the next page; null when this is the last page. */
  nextCursor: z.string().nullable(),
  /** Items in this response. */
  count: z.number().int().nonnegative(),
  /** Total across all pages, when cheap to compute. */
  total: z.number().int().nonnegative().nullable()
});

export type Pagination = z.infer<typeof paginationSchema>;

export function successSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    ok: z.literal(true),
    data
  });
}

export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    ok: z.literal(true),
    data: z.array(item),
    pagination: paginationSchema
  });
}

export const failureSchema = z.object({
  ok: z.literal(false),
  error: apiErrorSchema
});

export type ApiFailure = z.infer<typeof failureSchema>;

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiPaginated<T> = { ok: true; data: T[]; pagination: Pagination };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

/** Maps an error code to the HTTP status the handler should return. */
export const HTTP_STATUS_BY_ERROR_CODE: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  validation_failed: 422,
  rate_limited: 429,
  internal_error: 500,
  service_unavailable: 503
};

/** Query parameters accepted by the church list and search endpoints. */
export const churchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().max(80).optional(),
  denomination: z.string().trim().max(80).optional(),
  pastor: z.string().trim().max(120).optional(),
  ministry: z.string().trim().max(80).optional(),
  serviceDay: z
    .enum(["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"])
    .optional(),
  verified: z.coerce.boolean().optional(),
  claimed: z.coerce.boolean().optional(),
  hasWebsite: z.coerce.boolean().optional(),
  hasApp: z.coerce.boolean().optional(),
  hasLivestream: z.coerce.boolean().optional(),

  /** "Near me" support for the mobile client. */
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radiusMiles: z.coerce.number().positive().max(100).optional(),

  cursor: z.string().optional(),
  // Bounded so a client cannot request the entire table in one call.
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export type ChurchQuery = z.infer<typeof churchQuerySchema>;
