import {
  useInfiniteQuery,
  useQuery,
  type QueryClient
} from "@tanstack/react-query";
import type { ChurchQuery } from "@cccd/shared";
import { api } from "@/api";

/**
 * Data hooks.
 *
 * Cached aggressively and served stale-while-revalidating: a directory of
 * churches changes rarely, and the common mobile case is a poor connection in
 * an unfamiliar area. Cached data on screen beats a spinner.
 */

export const queryKeys = {
  churches: (filters: Partial<ChurchQuery>) => ["churches", filters] as const,
  church: (slug: string) => ["church", slug] as const,
  cities: () => ["cities"] as const,
  city: (slug: string) => ["city", slug] as const
};

export function configureQueryClient(client: QueryClient) {
  client.setDefaultOptions({
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: (failureCount, error) => {
        // Do not retry 404s or validation failures; only transient faults.
        const retryable = (error as { isRetryable?: boolean })?.isRetryable;
        return retryable === true && failureCount < 2;
      },
      refetchOnWindowFocus: false
    }
  });
}

export function useChurches(filters: Partial<ChurchQuery> = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.churches(filters),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.listChurches({ ...filters, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined
  });
}

export function useChurch(slug: string) {
  return useQuery({
    queryKey: queryKeys.church(slug),
    queryFn: () => api.getChurch(slug),
    enabled: Boolean(slug)
  });
}

export function useCities() {
  return useQuery({
    queryKey: queryKeys.cities(),
    queryFn: () => api.listCities()
  });
}

export function useCity(slug: string) {
  return useQuery({
    queryKey: queryKeys.city(slug),
    queryFn: () => api.getCity(slug),
    enabled: Boolean(slug)
  });
}
