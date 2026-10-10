import { fetchCities } from "@/lib/data/source";
import { apiSuccess, withApiErrorHandling } from "@/lib/api/response";

export const GET = withApiErrorHandling(async () => {
  return apiSuccess(await fetchCities(), { cache: true });
});
