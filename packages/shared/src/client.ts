import { z } from "zod";
import {
  API_VERSION,
  type ApiPaginated,
  type ApiResult,
  type ChurchQuery,
  failureSchema,
  paginatedSchema,
  successSchema
} from "./api";
import {
  churchDetailSchema,
  churchSummarySchema,
  citySchema,
  type ChurchDetail,
  type ChurchSummary,
  type City
} from "./church";

/**
 * Typed client for `/api/v1`, shared by the web app and the Expo app.
 *
 * Responses are parsed with the same schemas the server validates against, so a
 * contract drift surfaces as a caught error at the boundary instead of an
 * `undefined` deep inside a screen.
 */

export type ApiClientOptions = {
  /** Origin of the API, e.g. https://example.org. No trailing slash. */
  baseUrl: string;
  /** Returns the bearer token for authenticated calls, if signed in. */
  getAuthToken?: () => string | null | Promise<string | null>;
  /** Injectable for tests and for React Native's fetch. */
  fetchImpl?: typeof fetch;
  /** Abort requests after this many milliseconds. */
  timeoutMs?: number;
};

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors?: Array<{ path: string; message: string }>;
  readonly requestId?: string;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    fieldErrors?: Array<{ path: string; message: string }>;
    requestId?: string;
  }) {
    super(params.message);
    this.name = "ApiClientError";
    this.code = params.code;
    this.status = params.status;
    this.fieldErrors = params.fieldErrors;
    this.requestId = params.requestId;
  }

  /** True when retrying the same request might succeed. */
  get isRetryable() {
    return this.status >= 500 || this.status === 429;
  }
}

function buildQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }

  const serialised = search.toString();
  return serialised ? `?${serialised}` : "";
}

export function createApiClient(options: ApiClientOptions) {
  const {
    baseUrl,
    getAuthToken,
    fetchImpl = globalThis.fetch,
    timeoutMs = 15000
  } = options;

  if (!fetchImpl) {
    throw new Error("No fetch implementation available; pass fetchImpl.");
  }

  const root = `${baseUrl.replace(/\/+$/, "")}/api/${API_VERSION}`;

  async function request<T>(
    path: string,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    init?: RequestInit
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = new Headers(init?.headers);
      headers.set("Accept", "application/json");

      const token = await getAuthToken?.();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetchImpl(`${root}${path}`, {
        ...init,
        headers,
        signal: controller.signal
      });

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new ApiClientError({
          code: "internal_error",
          message: "The server returned an unexpected response.",
          status: response.status
        });
      }

      const body: unknown = await response.json();

      if (!response.ok) {
        const parsedFailure = failureSchema.safeParse(body);
        if (parsedFailure.success) {
          throw new ApiClientError({
            code: parsedFailure.data.error.code,
            message: parsedFailure.data.error.message,
            status: response.status,
            fieldErrors: parsedFailure.data.error.fieldErrors,
            requestId: parsedFailure.data.error.requestId
          });
        }

        throw new ApiClientError({
          code: "internal_error",
          message: "Something went wrong. Please try again.",
          status: response.status
        });
      }

      const parsed = schema.safeParse(body);
      if (!parsed.success) {
        // Contract drift: fail loudly at the boundary rather than letting a
        // malformed record propagate into the UI.
        throw new ApiClientError({
          code: "internal_error",
          message: "The server response did not match the expected format.",
          status: response.status
        });
      }

      return parsed.data;
    } catch (error) {
      if (error instanceof ApiClientError) throw error;

      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiClientError({
          code: "service_unavailable",
          message: "The request timed out. Check your connection and try again.",
          status: 0
        });
      }

      throw new ApiClientError({
        code: "service_unavailable",
        message: "Could not reach the directory. Check your connection.",
        status: 0
      });
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async listChurches(
      query: Partial<ChurchQuery> = {}
    ): Promise<ApiPaginated<ChurchSummary>> {
      return request(
        `/churches${buildQueryString(query)}`,
        paginatedSchema(churchSummarySchema)
      );
    },

    async getChurch(slug: string): Promise<ChurchDetail> {
      const result = await request(
        `/churches/${encodeURIComponent(slug)}`,
        successSchema(churchDetailSchema)
      );
      return result.data;
    },

    async listCities(): Promise<City[]> {
      const result = await request("/cities", successSchema(z.array(citySchema)));
      return result.data;
    },

    async getCity(slug: string): Promise<City> {
      const result = await request(
        `/cities/${encodeURIComponent(slug)}`,
        successSchema(citySchema)
      );
      return result.data;
    }
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
export type { ApiResult };
